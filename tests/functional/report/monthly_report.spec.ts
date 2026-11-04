import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import EnvelopeService from '#domains/budget/services/envelope_service'
import TransactionService from '#domains/budget/services/transaction_service'
import FuelService from '#domains/auto/services/fuel_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import HomeService from '#domains/maison/services/home_service'
import MeterService from '#domains/maison/services/meter_service'
import TaskService from '#domains/lists/services/task_service'
import MonthlyReportView from '#views/monthly_report_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import { renderPage } from '#tests/helpers/ssr'
import type { MonthlyReport } from '#shared/types/report'

/** The month before the current one: complete, never in the future. */
const first = today().startOf('month').minus({ months: 1 })
const month = first.toFormat('yyyy-LL')
const day = (n: number) => toIsoDate(first.set({ day: n }))

test.group('Report | monthly', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('gathers every domain for the month', async ({ assert }) => {
    const envelopes = await app.container.make(EnvelopeService)
    const transactions = await app.container.make(TransactionService)
    const courses = await envelopes.create({ name: 'Courses', monthlyBudget: 30_000 })
    await db.transaction(async (trx) => {
      await transactions.recordExpense(
        {
          amountCents: 12_000,
          label: 'Supermarché',
          occurredOn: day(5),
          envelopeId: courses.id,
          accountId: null,
        },
        trx
      )
      await transactions.recordExpense(
        {
          amountCents: 2_000,
          label: 'Boulangerie',
          occurredOn: day(6),
          envelopeId: courses.id,
          accountId: null,
        },
        trx
      )
      // The month before: only in the comparison.
      await transactions.recordExpense(
        {
          amountCents: 7_000,
          label: 'Supermarché',
          occurredOn: toIsoDate(first.minus({ days: 3 })),
          envelopeId: courses.id,
          accountId: null,
        },
        trx
      )
    })

    const vehicles = await app.container.make(VehicleService)
    const fuel = await app.container.make(FuelService)
    const clio = await vehicles.create({ name: 'Clio', fuel: 'e10', initialOdometerKm: 50_000 })
    await db.transaction(async (trx) => {
      await fuel.log(
        {
          vehicleId: clio.id,
          liters: 40,
          totalCents: 7_200,
          odometerKm: 50_600,
          filledOn: day(10),
          envelopeId: null,
          accountId: null,
        },
        trx,
        { vehicleName: 'Clio' }
      )
    })

    const homes = await app.container.make(HomeService)
    const meters = await app.container.make(MeterService)
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const water = await meters.create(home.id, { kind: 'water', label: 'Eau' })
    await meters.addReading(water.id, { readOn: day(1), value: 100 })
    await meters.addReading(water.id, {
      readOn: toIsoDate(first.plus({ months: 1 })),
      value: 109,
    })

    const tasks = await app.container.make(TaskService)
    const chore = await tasks.create({
      title: 'Aspirateur',
      recurrence: 'weekly',
      domain: 'maison',
      isChore: true,
      dueOn: day(3),
    })
    await tasks.complete(chore.id)
    await db
      .from('tasks')
      .where('id', chore.id)
      .update({ done_at: `${day(3)} 10:00:00` })

    const view = await app.container.make(MonthlyReportView)
    const report = await view.report(month, 'Clément')

    assert.isTrue(report.complete)
    // The fill-up is an expense too.
    assert.containsSubset(report.money, {
      spentCents: 14_000 + 7_200,
      previousSpentCents: 7_000,
      budgetedCents: 30_000,
    })
    assert.deepEqual(report.money.byEnvelope, [
      { name: 'Courses', spentCents: 14_000, budgetCents: 30_000 },
    ])
    assert.equal(report.money.topExpenses[0].label, 'Supermarché')
    assert.deepEqual(
      report.money.byDomain.map((row) => row.domain),
      ['budget', 'auto']
    )
    assert.lengthOf(report.money.trend, 6)
    assert.equal(report.money.trend[5].month, month)
    assert.equal(report.money.trend[5].cents, 14_000 + 7_200)

    assert.containsSubset(report.auto[0], {
      name: 'Clio',
      distanceKm: 600,
      fillUps: 1,
      fuelCents: 7_200,
      pricePerLiterCents: 180,
    })
    assert.deepEqual(report.maison.meters, [
      { label: 'Eau', unit: 'm³', consumption: 9, estimated: false, previous: null },
    ])
    assert.equal(report.maison.chores.done, 1)
    assert.equal(report.routine.tasksDone, 1)
  })

  test('the sheet renders and the entry point opens a month', async ({ assert }) => {
    await User.create({ fullName: 'Clément', email: 'report@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('report@paper.local', 'secret123')

    const redirect = await browser.request(urlFor('reports.current'))
    assert.equal(redirect.status, 302)
    assert.match(redirect.headers.get('location') ?? '', /\/compte-rendu\/\d{4}-\d{2}$/)

    const page = await browser.page(urlFor('reports.show', { month }))
    assert.equal(page.component, 'report')
    assert.equal((page.props.report as MonthlyReport).householdName, 'Clément')

    const html = await renderPage(page)
    assert.notMatch(html, /NaN|Infinity|undefined/)
    assert.include(html, 'Compte rendu du mois')
    assert.include(html, 'Imprimer ou enregistrer en PDF')
    for (const title of ['Argent', 'Enveloppes', 'Maison', 'Auto', 'Menu', 'Routine']) {
      assert.include(html, `${title}</h2>`)
    }

    const invalid = await browser.request('/compte-rendu/2026-13')
    assert.equal(invalid.status, 404)
  })
})
