import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/user'
import Recipe from '#domains/menu/models/recipe'
import Vehicle from '#domains/auto/models/vehicle'
import Home from '#domains/maison/models/home'
import BillService from '#domains/maison/services/bill_service'
import TaskService from '#domains/lists/services/task_service'
import SearchView from '#views/search_view'
import { today, toIsoDate } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { SearchResponse } from '#shared/types/search'

async function titles(query: string): Promise<string[]> {
  const search = await app.container.make(SearchView)
  const { results } = await search.search(query)
  return results.map((result) => result.title)
}

test.group('Search | global search', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('finds fiches despite typos, accents and case', async ({ assert }) => {
    await Recipe.create({ name: 'Pâtes carbonara', servings: 4, isDraft: false })
    await Vehicle.create({ name: 'Clio', plate: 'AB-123-CD', fuel: 'sp95', initialOdometerKm: 0 })
    await Home.create({ name: 'Maison de Léa', kind: 'house', occupancy: 'owner' })

    assert.deepEqual(await titles('carbonra'), ['Pâtes carbonara'])
    assert.deepEqual(await titles('PATES'), ['Pâtes carbonara'])
    assert.deepEqual(await titles('lea'), ['Maison de Léa'])
    assert.deepEqual(await titles('ab 123'), ['Clio'])
    assert.deepEqual(await titles('c'), [], 'one letter is too short')
    assert.deepEqual(await titles('zzzz'), [])
  })

  test('shows bills and open tasks, not the tasks already done', async ({ assert }) => {
    const bills = await app.container.make(BillService)
    const tasks = await app.container.make(TaskService)
    const bill = await bills.create({
      provider: 'EDF',
      amountCents: 8200,
      dueOn: toIsoDate(today().plus({ days: 20 })),
    })
    await tasks.create({ title: 'Relever le compteur EDF' })
    const done = await tasks.create({ title: 'Appeler EDF' })
    await tasks.complete(done.id)

    const search = await app.container.make(SearchView)
    const { results } = await search.search('edf')
    const byTitle = new Map(results.map((result) => [result.title, result]))
    assert.sameMembers([...byTitle.keys()], ['Facture EDF', 'Relever le compteur EDF'])
    assert.equal(byTitle.get('Facture EDF')!.group, 'Factures')
    assert.equal(byTitle.get('Facture EDF')!.domain, 'maison')
    assert.equal(byTitle.get('Facture EDF')!.href, urlFor('bills.show', { id: bill.id }))
  })

  test('answers the palette in JSON, for signed-in users only', async ({ assert }) => {
    await Recipe.create({ name: 'Raclette', servings: 6, isDraft: true })

    const anonymous = await new Browser().request(`${urlFor('search')}?q=raclette`, {
      headers: { accept: 'application/json' },
    })
    assert.notEqual(anonymous.status, 200)

    await User.create({ email: 'search@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('search@paper.local', 'secret123')
    const response = await browser.request(`${urlFor('search')}?q=raclete`, {
      headers: { accept: 'application/json' },
    })
    assert.equal(response.status, 200)
    const body = (await response.json()) as SearchResponse
    assert.equal(body.query, 'raclete')
    assert.lengthOf(body.results, 1)
    assert.include(body.results[0], { title: 'Raclette', group: 'Recettes', detail: 'brouillon' })
  })
})
