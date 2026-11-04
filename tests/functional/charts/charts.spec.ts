import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import TransactionService from '#domains/budget/services/transaction_service'
import FuelService from '#domains/auto/services/fuel_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import HomeService from '#domains/maison/services/home_service'
import MeterService from '#domains/maison/services/meter_service'
import MoneyView from '#views/money_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import { renderPage, svgs } from '#tests/helpers/ssr'
import type { VehicleDetail } from '#shared/types/auto'

const monthsAgo = (months: number, day = 1) =>
  toIsoDate(today().startOf('month').minus({ months }).set({ day }))

async function login() {
  await User.create({ email: 'charts@paper.local', password: 'secret123' })
  const browser = new Browser()
  await browser.login('charts@paper.local', 'secret123')
  return browser
}

/** No broken geometry: NaN or Infinity in any attribute. */
function assertGeometry(
  assert: { notMatch: (value: string, regexp: RegExp) => void },
  svg: string
) {
  assert.notMatch(svg, /NaN|Infinity/)
}

test.group('Charts', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('monthly spending and balance series', async ({ assert }) => {
    const accounts = await app.container.make(AccountService)
    const transactions = await app.container.make(TransactionService)
    const account = await accounts.create({
      name: 'Courant',
      type: 'checking',
      openingBalance: 100_000,
    })
    await db.transaction(async (trx) => {
      for (const [months, cents] of [
        [0, 4_000],
        [1, 12_000],
        [1, 3_000],
        [5, 7_500],
        [13, 99_900],
      ] as const) {
        await transactions.recordExpense(
          {
            amountCents: cents,
            label: 'Achat',
            occurredOn: monthsAgo(months),
            envelopeId: null,
            accountId: account.id,
          },
          trx
        )
      }
    })

    const money = await app.container.make(MoneyView)
    const spending = await money.monthlySpending()
    assert.lengthOf(spending, 12)
    assert.equal(spending[11].month, today().toFormat('yyyy-LL'))
    assert.equal(spending[11].cents, 4_000)
    assert.equal(spending[10].cents, 15_000)
    assert.equal(spending[6].cents, 7_500)
    assert.equal(
      spending.reduce((total, month) => total + month.cents, 0),
      26_500
    )

    const balances = await money.balanceHistory(account.id, 100_000)
    // The expense of 13 months ago is before the window: it is in the base.
    assert.equal(balances[0].cents, 100_000 - 99_900)
    assert.equal(balances[11].cents, 100_000 - 99_900 - 26_500)
  })

  test('the money, envelope and account pages draw their charts', async ({ assert }) => {
    const accounts = await app.container.make(AccountService)
    const envelopes = await app.container.make(EnvelopeService)
    const transactions = await app.container.make(TransactionService)
    const account = await accounts.create({ name: 'Courant', type: 'checking' })
    const envelope = await envelopes.create({ name: 'Courses', monthlyBudget: 40_000 })
    await db.transaction(async (trx) => {
      for (let months = 0; months < 12; months++) {
        await transactions.recordExpense(
          {
            amountCents: 20_000 + months * 1_000,
            label: 'Courses',
            occurredOn: monthsAgo(months),
            envelopeId: envelope.id,
            accountId: account.id,
          },
          trx
        )
      }
    })
    const browser = await login()

    const money = await renderPage(await browser.page(urlFor('money')))
    const [spendingChart] = svgs(money)
    assertGeometry(assert, spendingChart)
    assert.lengthOf(spendingChart.match(/<path d="M/g) ?? [], 12)
    assert.include(money, 'Voir les données')

    const envelopePage = await renderPage(
      await browser.page(urlFor('envelopes.show', { id: envelope.id }))
    )
    const [envelopeChart] = svgs(envelopePage)
    assertGeometry(assert, envelopeChart)
    assert.include(envelopePage, 'Budget mensuel : 400,00')
    assert.match(envelopeChart, /stroke-opacity="0.45"/)

    const accountPage = await renderPage(
      await browser.page(urlFor('accounts.show', { id: account.id }))
    )
    const [balanceChart] = svgs(accountPage)
    assertGeometry(assert, balanceChart)
    assert.match(balanceChart, /stroke-width="2"/)
  })

  test('fill-ups give a price and a consumption curve', async ({ assert }) => {
    const vehicles = await app.container.make(VehicleService)
    const fuel = await app.container.make(FuelService)
    const vehicle = await vehicles.create({ name: 'Clio', fuel: 'e10' })
    const fills = [
      { liters: 40, totalCents: 7_200, odometerKm: 100_000, filledOn: monthsAgo(3) },
      { liters: 35, totalCents: 6_440, odometerKm: 100_600, filledOn: monthsAgo(2) },
      { liters: 30, totalCents: 5_700, odometerKm: 101_100, filledOn: monthsAgo(1) },
    ]
    await db.transaction(async (trx) => {
      for (const fill of fills) {
        await fuel.log({ ...fill, vehicleId: vehicle.id, envelopeId: null, accountId: null }, trx, {
          vehicleName: 'Clio',
        })
      }
    })
    const browser = await login()

    const page = await browser.page(urlFor('vehicles.show', { id: vehicle.id }))
    const detail = page.props.vehicle as VehicleDetail
    const byDate = [...detail.fuelLogs].reverse()
    assert.deepEqual(
      byDate.map((log) => log.litersPer100Km),
      [null, 5.8, 6]
    )

    const html = await renderPage(page)
    const charts = svgs(html)
    assert.lengthOf(charts, 2)
    charts.forEach((chart) => assertGeometry(assert, chart))
    assert.include(charts[0], '1,90 €/L')
    assert.notInclude(charts[0], '1,83')
    assert.include(charts[1], '6 L/100')
  })

  test('meter readings give a daily consumption curve', async ({ assert }) => {
    const homes = await app.container.make(HomeService)
    const meters = await app.container.make(MeterService)
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const meter = await meters.create(home.id, { kind: 'electricity', label: 'Linky' })
    await meters.addReading(meter.id, { readOn: monthsAgo(3, 1), value: 1_000 })
    await meters.addReading(meter.id, { readOn: monthsAgo(2, 1), value: 1_310 })
    await meters.addReading(meter.id, { readOn: monthsAgo(1, 1), value: 1_590 })
    const browser = await login()

    const html = await renderPage(await browser.page(urlFor('meters.show', { id: meter.id })))
    const [chart] = svgs(html)
    assertGeometry(assert, chart)
    assert.include(chart, 'kWh/j')
    assert.include(chart, 'aria-label="Consommation moyenne par jour, en kWh"')
  })
})
