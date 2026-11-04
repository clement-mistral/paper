import { test } from '@japa/runner'
import { extractArticle, splitLong } from '#domains/news/services/article_extractor'
import { cleanSummary } from '#domains/news/services/feed_parser'
import { isLiveOrMedia } from '#domains/news/services/news_service'
import { layoutFullText, PAGE_CHARS } from '#views/newspaper_view'
import type { EditionItem } from '#shared/types/news'

const sentence = 'Une phrase de test qui fait à peu près soixante caractères. '

function item(id: number, title: string, chars: number | null): EditionItem {
  return {
    id,
    title,
    summary: 'Chapô.',
    link: `https://www.20minutes.fr/article-${id}`,
    publishedAt: '2026-11-04T08:00:00.000+01:00',
    source: '20 Minutes',
    section: 'Sciences',
    paragraphs:
      chars === null
        ? null
        : Array.from({ length: Math.ceil(chars / 600) }, () => sentence.repeat(10).trim()),
    restricted: false,
  }
}

test.group('News | article extraction', () => {
  test('schema.org articleBody comes first, a wall of text is split', ({ assert }) => {
    const body = `${sentence.repeat(30)}`
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
      {"@type":"WebPage"},{"@type":"NewsArticle","headline":"T","articleBody":${JSON.stringify(body)}}]}</script>
      <article><p>${'Autre texte de la page, jamais utilisé ici. '.repeat(3)}</p></article>`
    const article = extractArticle(html)!
    assert.isFalse(article.restricted)
    assert.isAbove(article.paragraphs.length, 3)
    assert.isTrue(article.paragraphs.every((paragraph) => paragraph.length <= 700))
    assert.equal(article.paragraphs.join(' ').replace(/\s+/g, ' '), body.trim())
  })

  test('the paragraphs of <article>, without figures and asides', ({ assert }) => {
    const html = `<html><body><nav><p>${'Menu du site très long à ignorer complètement. '.repeat(2)}</p></nav>
      <article><h1>Titre</h1>
        <p>Premier paragraphe assez long pour être gardé dans l’article imprimé.</p>
        <figure><p>Légende de la photo qui ne doit pas apparaître du tout ici.</p></figure>
        <p>Court.</p>
        <aside><p>À lire aussi : un autre article qui n’a rien à faire là.</p></aside>
        <p>Second paragraphe, lui aussi largement assez long pour compter.</p>
      </article></body></html>`
    assert.deepEqual(extractArticle(html)?.paragraphs, [
      'Premier paragraphe assez long pour être gardé dans l’article imprimé.',
      'Second paragraphe, lui aussi largement assez long pour compter.',
    ])
  })

  test('a paywalled article says so', ({ assert }) => {
    const html = `<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":false,
      "articleBody":"Le début public de l’article, assez long pour être conservé ici."}</script>`
    assert.isTrue(extractArticle(html)!.restricted)
  })

  test('nothing readable', ({ assert }) => {
    assert.isNull(extractArticle('<html><body><p>Rien</p></body></html>'))
  })

  test('long blocks are split on sentence ends', ({ assert }) => {
    const parts = splitLong(sentence.repeat(20))
    assert.isAbove(parts.length, 1)
    assert.isTrue(parts.every((part) => part.endsWith('.')))
    assert.deepEqual(splitLong('Court.'), ['Court.'])
  })
})

test.group('News | summaries and live blogs', () => {
  test('feed boilerplate is removed', ({ assert }) => {
    assert.equal(
      cleanSummary(
        'Un appareil a réagi. The post Dans les années 1930 appeared first on Science et vie .'
      ),
      'Un appareil a réagi.'
    )
    assert.equal(
      cleanSummary('Le chapô. L’article Titre est apparu en premier sur Presse-citron.'),
      'Le chapô.'
    )
    assert.equal(
      cleanSummary('Début du texte [&hellip;]'.replace('&hellip;', '…')),
      'Début du texte…'
    )
    assert.equal(cleanSummary('Le chapô. Lire la suite'), 'Le chapô.')
  })

  test('live blogs and videos', ({ assert }) => {
    assert.isTrue(isLiveOrMedia('DIRECT. Mobilisation du 5 novembre'))
    assert.isTrue(isLiveOrMedia('EN DIRECT, midterms 2026'))
    assert.isTrue(isLiveOrMedia('VIDÉO. Le robot qui plie le linge'))
    assert.isFalse(isLiveOrMedia('Le directeur de la Banque de France'))
  })
})

test.group('News | full text pages', () => {
  test('articles fill page 2 then page 3; one with no room left stays on the front page', ({
    assert,
  }) => {
    const items = [
      item(1, 'Premier', 2400),
      item(2, 'Deuxième', 2400),
      item(3, 'Troisième', 2400),
      item(4, 'Quatrième', 2400),
      item(5, 'Cinquième', 2400),
    ]
    const { pages, continuesOn } = layoutFullText(items)
    assert.deepEqual(
      pages.map((page) => [page.number, page.articles.map((article) => article.id)]),
      [
        [2, [1, 2]],
        [3, [3, 4]],
      ]
    )
    assert.isFalse(continuesOn.has(5), 'no room left: front page only')
    for (const page of pages) {
      const chars = page.articles.reduce(
        (total, article) => total + article.paragraphs.join('').length + 320,
        0
      )
      assert.isAtMost(chars, PAGE_CHARS)
    }
  })

  test('a long article is cut to the room left, with the publisher for the rest', ({ assert }) => {
    const { pages, continuesOn } = layoutFullText([
      item(1, 'Court', 2000),
      item(2, 'Fleuve', 20_000),
    ])
    const long = pages.flatMap((page) => page.articles).find((article) => article.id === 2)!
    assert.isTrue(long.truncated)
    assert.equal(long.host, '20minutes.fr')
    assert.equal(continuesOn.get(1), 2)
  })

  test('live blogs and unreadable pages stay on the front page', ({ assert }) => {
    const { pages } = layoutFullText([item(1, 'DIRECT. Grève', 3000), item(2, 'Sans texte', null)])
    assert.lengthOf(pages, 0)
  })
})
