import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { decodeEntities, parseFeed, plain } from '#domains/news/services/feed_parser'
import { QUOTES, quoteOf, saintOf } from '#domains/news/ephemeris'
import { weatherLabel } from '#domains/news/services/weather_service'
import { HOME_ZONE } from '#support/dates'

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Ouest Exemple</title>
  <link>https://exemple.fr</link>
  <item>
    <title><![CDATA[Le marché de Noël ouvre samedi]]></title>
    <link>https://exemple.fr/noel</link>
    <guid isPermaLink="false">noel-2026</guid>
    <pubDate>Wed, 04 Nov 2026 07:30:00 +0100</pubDate>
    <description><![CDATA[<p>Une <b>trentaine</b> de chalets&nbsp;place de la Mairie.</p><img src="x.jpg"/>]]></description>
  </item>
  <item>
    <title>Travaux : la rocade fermée l&#039;après-midi</title>
    <link>https://exemple.fr/rocade</link>
    <description>&lt;p&gt;Déviation par le centre &amp;amp; les quais.&lt;/p&gt;</description>
  </item>
  <item><title></title><link>https://exemple.fr/vide</link></item>
</channel></rss>`

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">Blog du club</title>
  <entry>
    <title>Résultats du week-end</title>
    <link rel="alternate" href="https://club.fr/resultats"/>
    <link rel="enclosure" href="https://club.fr/photo.jpg"/>
    <id>tag:club.fr,2026:42</id>
    <updated>2026-11-03T18:00:00Z</updated>
    <summary type="html">&lt;p&gt;Victoire 3 à 1 des seniors.&lt;/p&gt;</summary>
  </entry>
</feed>`

test.group('News | feed parser', () => {
  test('RSS: CDATA, entities, HTML summaries, missing guid and date', ({ assert }) => {
    const feed = parseFeed(RSS)
    assert.equal(feed.title, 'Ouest Exemple')
    assert.lengthOf(feed.entries, 2, 'the entry without title is skipped')
    const [noel, rocade] = feed.entries
    assert.deepEqual(noel, {
      guid: 'noel-2026',
      title: 'Le marché de Noël ouvre samedi',
      summary: 'Une trentaine de chalets place de la Mairie.',
      link: 'https://exemple.fr/noel',
      publishedAt: new Date('2026-11-04T06:30:00Z'),
    })
    assert.equal(rocade.title, "Travaux : la rocade fermée l'après-midi")
    assert.equal(rocade.summary, 'Déviation par le centre & les quais.')
    assert.equal(rocade.guid, 'https://exemple.fr/rocade')
    assert.isNull(rocade.publishedAt)
  })

  test('Atom: alternate link, id, updated, HTML summary', ({ assert }) => {
    const feed = parseFeed(ATOM)
    assert.equal(feed.title, 'Blog du club')
    assert.deepEqual(feed.entries[0], {
      guid: 'tag:club.fr,2026:42',
      title: 'Résultats du week-end',
      summary: 'Victoire 3 à 1 des seniors.',
      link: 'https://club.fr/resultats',
      publishedAt: new Date('2026-11-03T18:00:00Z'),
    })
  })

  test('long summaries are cut on a word', ({ assert }) => {
    const long = 'mot '.repeat(400)
    const feed = parseFeed(
      `<rss><channel><item><title>T</title><description>${long}</description></item></channel></rss>`
    )
    const summary = feed.entries[0].summary!
    assert.isAtMost(summary.length, 601)
    assert.isTrue(summary.endsWith('mot…'))
  })

  test('entities and tags', ({ assert }) => {
    assert.equal(decodeEntities('&eacute;t&eacute; &#233; &#x2019; &unknown;'), 'été é ’ &unknown;')
    assert.equal(
      plain('<script>alert(1)</script> Bonjour<br/>tout le monde '),
      'Bonjour tout le monde'
    )
    assert.isNull(plain('<p> </p>'))
  })
})

test.group('News | ephemeris and weather', () => {
  const day = (iso: string) => DateTime.fromISO(iso, { zone: HOME_ZONE })

  test('saint of the day', ({ assert }) => {
    assert.equal(saintOf(day('2026-11-04')), 'Charles')
    assert.equal(saintOf(day('2028-02-29')), 'Auguste')
    assert.equal(saintOf(day('2026-12-31')), 'Sylvestre')
  })

  test('one quote per day, in turn', ({ assert }) => {
    assert.deepEqual(quoteOf(day('2026-01-01')), QUOTES[0])
    assert.deepEqual(quoteOf(day('2026-01-02')), QUOTES[1])
    assert.notDeepEqual(quoteOf(day('2026-11-04')), quoteOf(day('2026-11-05')))
  })

  test('weather codes', ({ assert }) => {
    assert.equal(weatherLabel(0), 'Ciel dégagé')
    assert.equal(weatherLabel(63), 'Pluie')
    assert.equal(weatherLabel(81), 'Averses')
    assert.equal(weatherLabel(95), 'Orages')
  })
})
