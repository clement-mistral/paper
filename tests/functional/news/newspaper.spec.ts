import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import NewsItem from '#domains/news/models/news_item'
import NewsSource from '#domains/news/models/news_source'
import NewsService from '#domains/news/services/news_service'
import TaskService from '#domains/lists/services/task_service'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import { renderPage } from '#tests/helpers/ssr'
import type { NewsChoice, Newspaper } from '#shared/types/news'

async function seed() {
  const monde = await NewsSource.create({
    name: 'Le Quotidien',
    url: 'https://exemple.fr/rss',
    section: 'Monde',
  })
  const local = await NewsSource.create({
    name: 'Ouest Exemple',
    url: 'https://ouest.fr/rss',
    section: 'Local',
  })
  const rows: Array<[NewsSource, string, number]> = [
    [monde, 'Sommet sur le climat', 1],
    [monde, 'Élections au Canada', 2],
    [monde, 'Accord commercial', 3],
    [monde, 'Visite d’État', 5],
    [local, 'Marché de Noël', 1],
    [local, 'Travaux sur la rocade', 4],
  ]
  const items: NewsItem[] = []
  for (const [source, title, hours] of rows) {
    items.push(
      await NewsItem.create({
        sourceId: source.id,
        guid: title,
        title,
        summary: `Résumé : ${title}.`,
        link: `https://exemple.fr/${items.length}`,
        publishedAt: DateTime.now().minus({ minutes: hours * 10 }),
        // Never fetched from the network in tests.
        body: `Texte complet de « ${title} », assez long pour être imprimé en entier.`,
        bodyFetchedAt: DateTime.now(),
      })
    )
  }
  return { monde, local, items }
}

test.group('News | default sources', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('installed once, never added back once removed', async ({ assert }) => {
    const news = await app.container.make(NewsService)
    assert.isTrue(await news.installDefaults())
    let sources = await news.sources()
    assert.sameMembers(
      [...new Set(sources.map((source) => source.section))],
      ['Sciences', 'Économie', 'Technologie']
    )
    assert.lengthOf(sources, 6)
    await news.deleteSource(sources.find((source) => source.name === '01net')!.id)
    assert.isFalse(await news.installDefaults())
    sources = await news.sources()
    assert.lengthOf(sources, 5)

    const suggested = await news.suggestions()
    const suggestions = suggested.map((suggestion) => suggestion.name)
    assert.include(suggestions, '01net', 'a removed default is offered again as a suggestion')
    assert.notInclude(suggestions, 'Science & Vie', 'followed sources are not suggested')
  })

  test('an updated list replaces the previous defaults, not the sources added by hand', async ({
    assert,
  }) => {
    await NewsSource.create({
      name: 'Le Monde',
      url: 'https://www.lemonde.fr/rss/une.xml',
      section: 'À la une',
    })
    await NewsSource.create({ name: 'Mon club', url: 'https://club.example/rss', section: 'Local' })
    await db.table('newspaper_settings').insert({
      title: 'Le journal du foyer',
      per_section: 2,
      defaults_installed: true,
      defaults_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const news = await app.container.make(NewsService)
    assert.isTrue(await news.installDefaults())
    const followed = await news.sources()
    const names = followed.map((source) => source.name)
    assert.notInclude(names, 'Le Monde')
    assert.include(names, 'Mon club')
    assert.lengthOf(names, 7)
  })

  test('the first visit installs them, articles come with the next refresh', async ({ assert }) => {
    await User.create({ email: 'defaults@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('defaults@paper.local', 'secret123')
    const page = await browser.page(urlFor('newspapers.choice', { day: toIsoDate(today()) }))
    assert.isTrue(page.props.loading as boolean)
    const again = await browser.page(urlFor('newspapers.choice', { day: toIsoDate(today()) }))
    assert.isFalse(again.props.loading as boolean)
    const news = await app.container.make(NewsService)
    assert.lengthOf(await news.sources(), 6)
  })
})

test.group('News | journal du jour', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('pre-selects the most recent per rubrique, then keeps the saved choice', async ({
    assert,
  }) => {
    const { items } = await seed()
    const news = await app.container.make(NewsService)
    const day = toIsoDate(today())
    const titles = (ids: number[]) =>
      ids.map((id) => items.find((item) => item.id === id)!.title).sort()

    let choice = await news.choice(day)
    assert.isFalse(choice.saved)
    assert.deepEqual(
      choice.sections.map((section) => section.name),
      ['Local', 'Monde']
    )
    assert.deepEqual(titles(choice.pickedIds), [
      'Marché de Noël',
      'Sommet sur le climat',
      'Travaux sur la rocade',
      'Élections au Canada',
    ])

    await news.savePicks(day, [items[3].id, items[4].id])
    choice = await news.choice(day)
    assert.isTrue(choice.saved)
    const edition = await news.edition(day)
    assert.deepEqual(
      edition.map((section) => [section.name, section.items.map((item) => item.title)]),
      [
        ['Local', ['Marché de Noël']],
        ['Monde', ['Visite d’État']],
      ]
    )
  })

  test('old articles are forgotten unless picked', async ({ assert }) => {
    const { items } = await seed()
    const news = await app.container.make(NewsService)
    const old = items.slice(0, 2)
    for (const item of old) {
      item.publishedAt = DateTime.now().minus({ days: 10 })
      await item.save()
    }
    await news.savePicks(toIsoDate(today().minus({ days: 10 })), [old[0].id])
    await news.prune()
    const left = await NewsItem.query().whereIn(
      'id',
      old.map(({ id }) => id)
    )
    assert.deepEqual(
      left.map(({ id }) => id),
      [old[0].id]
    )
  })

  test('a failing source is recorded without stopping the others', async ({ assert }) => {
    await NewsSource.create({ name: 'Local', url: 'http://127.0.0.1/rss', section: 'Local' })
    const news = await app.container.make(NewsService)
    const result = await news.refreshAll()
    assert.deepEqual(result, { fetched: 0, failed: 1 })
    const [source] = await news.sources()
    assert.equal(source.lastError, 'Seuls les sites publics sont accessibles')
  })

  test('the pages render and the choice is saved from the screen', async ({ assert }) => {
    const { items } = await seed()
    await User.create({ fullName: 'Clément', email: 'journal@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('journal@paper.local', 'secret123')
    const day = toIsoDate(today())

    const redirect = await browser.request(urlFor('newspapers.current'))
    assert.equal(redirect.headers.get('location'), urlFor('newspapers.show', { day }))

    const choicePage = await browser.page(urlFor('newspapers.choice', { day }))
    assert.equal(choicePage.component, 'newspaper/choice')
    assert.lengthOf((choicePage.props.choice as NewsChoice).pickedIds, 4)

    const response = await browser.submit(
      urlFor('newspapers.choice.save', { day }),
      { 'itemIds[0]': String(items[0].id), 'itemIds[1]': String(items[5].id) },
      'PUT'
    )
    assert.equal(response.status, 302)

    const page = await browser.page(urlFor('newspapers.show', { day }))
    assert.equal(page.component, 'newspaper/show')
    const newspaper = page.props.newspaper as Newspaper
    assert.equal(newspaper.title, 'Le journal du foyer')
    assert.equal(newspaper.issue, today().ordinal)
    assert.deepEqual(
      newspaper.sections.flatMap((section) => section.items.map((item) => item.title)),
      ['Travaux sur la rocade', 'Sommet sur le climat']
    )
    assert.deepEqual(
      newspaper.sections.flatMap((section) => section.items.map((item) => item.continuesOn)),
      [2, 2]
    )
    assert.deepEqual(
      newspaper.pages.map((sheet) => sheet.articles.map((article) => article.title)),
      [['Travaux sur la rocade', 'Sommet sur le climat']]
    )
    assert.isNull(newspaper.weather, 'no city set')
    const html = await renderPage(page)
    assert.notMatch(html, /NaN|Infinity|>undefined</)
    assert.include(html, 'Sommet sur le climat')
    assert.match(html, new RegExp(`Saint (<!-- -->)?${newspaper.ephemeris.saint}`))

    const sources = await browser.page(urlFor('newspapers.sources'))
    assert.equal(sources.component, 'newspaper/sources')
    await renderPage(sources)

    await browser.submit(urlFor('newspapers.sources.store'), {
      url: 'http://192.168.1.5/feed',
      section: 'Local',
    })
    const refused = await browser.page(urlFor('newspapers.sources'))
    assert.equal(
      (refused.props.errors as Record<string, string>).url,
      'Seuls les sites publics sont accessibles'
    )

    await browser.submit(
      urlFor('newspapers.settings'),
      { title: 'La Gazette de la maison', perSection: '2' },
      'PUT'
    )
    const news = await app.container.make(NewsService)
    assert.containsSubset(await news.settings(), {
      title: 'La Gazette de la maison',
      perSection: 2,
    })
  })
})

test.group('News | journal du lendemain', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('tomorrow does not pre-check what today printed', async ({ assert }) => {
    const { items } = await seed()
    const news = await app.container.make(NewsService)
    const day = toIsoDate(today())
    const tomorrow = toIsoDate(today().plus({ days: 1 }))

    const todayChoice = await news.choice(day)
    await news.savePicks(day, todayChoice.pickedIds)

    const next = await news.choice(tomorrow)
    assert.isFalse(next.saved)
    assert.lengthOf(
      next.pickedIds.filter((id) => todayChoice.pickedIds.includes(id)),
      0,
      'no article of today is pre-checked again'
    )
    const titles = next.pickedIds.map((id) => items.find((item) => item.id === id)!.title)
    assert.sameMembers(titles, ['Accord commercial', 'Visite d’État'])
    const offered = next.sections.flatMap((section) => section.items.map((item) => item.id))
    assert.includeMembers(offered, todayChoice.pickedIds, 'still offered, only not pre-checked')
  })

  test('tomorrow’s sheet shows tomorrow’s day', async ({ assert }) => {
    await seed()
    const tasks = await app.container.make(TaskService)
    const tomorrow = toIsoDate(today().plus({ days: 1 }))
    await tasks.create({
      title: 'Contrôle technique',
      dueOn: tomorrow,
      dueTime: '09:00',
      domain: 'auto',
    })
    await tasks.create({ title: 'Appeler la banque', dueOn: toIsoDate(today()), domain: 'budget' })
    await User.create({ email: 'demain@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('demain@paper.local', 'secret123')

    const redirect = await browser.request(urlFor('newspapers.tomorrow'))
    assert.equal(redirect.headers.get('location'), urlFor('newspapers.show', { day: tomorrow }))

    const page = await browser.page(urlFor('newspapers.show', { day: tomorrow }))
    const newspaper = page.props.newspaper as Newspaper
    assert.equal(newspaper.day, tomorrow)
    assert.equal(newspaper.issue, today().plus({ days: 1 }).ordinal)
    assert.deepEqual(
      newspaper.myDay.items.map((item) => item.title),
      ['Contrôle technique']
    )
    const html = await renderPage(page)
    assert.include(html, 'Demain')
    assert.notMatch(html, /NaN|Infinity|>undefined</)

    const choice = await browser.page(urlFor('newspapers.choice', { day: tomorrow }))
    assert.equal(choice.component, 'newspaper/choice')
  })
})
