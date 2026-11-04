import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Maintenance from '#domains/auto/models/maintenance'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import AgendaView from '#views/agenda_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { VehicleMaintenances } from '#shared/types/auto'

async function setup() {
  const vehicles = await app.container.make(VehicleService)
  const maintenances = await app.container.make(MaintenanceService)
  const vehicle = await vehicles.create({ name: 'Clio', fuel: 'e10', initialOdometerKm: 100_000 })
  return { vehicles, maintenances, vehicle }
}

function expensesFor(maintenanceId: number) {
  return db
    .from('transactions')
    .where({ source_type: 'maintenance', source_id: maintenanceId })
    .select('amount_cents', 'label', 'domain', 'occurred_on')
}

const inDays = (days: number) => toIsoDate(today().plus({ days }))

test.group('Auto | maintenances', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a done maintenance with a cost is an expense and plans the next one', async ({
    assert,
  }) => {
    const { maintenances, vehicle } = await setup()
    const { maintenance: done } = await maintenances.createDone(vehicle.id, {
      kind: 'oil_change',
      doneOn: '2026-10-01',
      odometerKm: 101_000,
      costCents: 8990,
      intervalKm: 15_000,
      intervalMonths: 12,
    })

    const expenses = await expensesFor(done.id)
    assert.lengthOf(expenses, 1)
    assert.containsSubset(expenses[0], {
      amount_cents: -8990,
      label: 'Entretien Clio · Vidange',
      domain: 'auto',
    })

    const next = await Maintenance.query().where('vehicle_id', vehicle.id).whereNull('done_on')
    assert.lengthOf(next, 1)
    assert.equal(toIsoDate(next[0].dueOn!), '2027-10-01')
    assert.equal(next[0].dueOdometerKm, 116_000)
    assert.equal(next[0].kind, 'oil_change')
  })

  test('a done maintenance without cost or interval records nothing else', async ({ assert }) => {
    const { maintenances, vehicle } = await setup()
    const { maintenance: done } = await maintenances.createDone(vehicle.id, {
      kind: 'tires',
      label: 'Permutation',
      doneOn: '2026-10-01',
    })

    assert.lengthOf(await expensesFor(done.id), 0)
    const log = await maintenances.forVehicle(vehicle.id)
    assert.lengthOf(log.planned, 0)
    assert.equal(log.history[0].title, 'Permutation')
  })

  test('status: planned, upcoming and overdue by date or mileage', async ({ assert }) => {
    const { maintenances, vehicle } = await setup()
    await maintenances.createPlanned(vehicle.id, { kind: 'inspection', dueOn: inDays(90) })
    await maintenances.createPlanned(vehicle.id, { kind: 'brakes', dueOn: inDays(10) })
    await maintenances.createPlanned(vehicle.id, { kind: 'battery', dueOn: inDays(-1) })
    await maintenances.createPlanned(vehicle.id, { kind: 'oil_change', dueOdometerKm: 100_500 })
    await maintenances.createPlanned(vehicle.id, { kind: 'timing_belt', dueOdometerKm: 99_000 })

    const { planned } = await maintenances.forVehicle(vehicle.id)
    const byKind = Object.fromEntries(planned.map((row) => [row.kind, row.status]))
    assert.deepEqual(byKind, {
      inspection: 'planned',
      brakes: 'upcoming',
      battery: 'overdue',
      oil_change: 'upcoming',
      timing_belt: 'overdue',
    })
    assert.deepEqual(
      planned.map((row) => row.status),
      ['overdue', 'overdue', 'upcoming', 'upcoming', 'planned']
    )
  })

  test('« Marquer fait » records the expense, plans the next and refuses twice', async ({
    assert,
  }) => {
    const { maintenances, vehicles, vehicle } = await setup()
    const planned = await maintenances.createPlanned(vehicle.id, {
      kind: 'oil_change',
      dueOdometerKm: 115_000,
      intervalKm: 15_000,
    })

    const { maintenance, next } = await maintenances.complete(planned.id, {
      doneOn: '2026-11-01',
      odometerKm: 114_200,
      costCents: 9500,
    })
    assert.isNotNull(maintenance.doneOn)
    assert.lengthOf(await expensesFor(planned.id), 1)
    assert.equal(next?.dueOdometerKm, 129_200)
    assert.isNull(next?.dueOn)
    assert.equal(await vehicles.odometer(vehicle.id), 114_200)

    await assert.rejects(() => maintenances.complete(planned.id, { doneOn: '2026-11-02' }))
  })

  test('editing a done maintenance updates its expense', async ({ assert }) => {
    const { maintenances, vehicle } = await setup()
    const { maintenance: done } = await maintenances.createDone(vehicle.id, {
      kind: 'repair',
      doneOn: '2026-10-01',
      costCents: 10_000,
    })
    await maintenances.updateDone(done.id, {
      kind: 'repair',
      label: 'Rétroviseur',
      doneOn: '2026-10-02',
      costCents: 12_000,
    })

    const expenses = await expensesFor(done.id)
    assert.lengthOf(expenses, 1)
    assert.equal(Math.abs(expenses[0].amount_cents), 12_000)
    assert.equal(expenses[0].label, 'Entretien Clio · Rétroviseur')
  })

  test('planned maintenances show in « Aujourd’hui » and « Agenda »', async ({ assert }) => {
    const { maintenances, vehicle } = await setup()
    await maintenances.createPlanned(vehicle.id, { kind: 'inspection', dueOn: inDays(1) })
    await maintenances.createPlanned(vehicle.id, { kind: 'oil_change', dueOdometerKm: 99_000 })

    const agenda = await app.container.make(AgendaView)
    const overview = await agenda.today()
    assert.deepEqual(
      overview.tomorrow.filter((item) => item.kind === 'maintenance').map((item) => item.title),
      ['Contrôle technique']
    )
    const overdue = overview.overdue.filter((item) => item.kind === 'maintenance')
    assert.lengthOf(overdue, 1)
    assert.equal(overdue[0].title, 'Vidange')
    assert.equal(overdue[0].date, toIsoDate(today()))
    assert.include(overdue[0].detail ?? '', 'Clio')
  })
})

test.group('Auto | maintenance pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function login() {
    await User.create({ email: 'auto@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('auto@paper.local', 'secret123')
    return browser
  }

  test('notes and plans maintenances from the vehicle fiche', async ({ assert }) => {
    const { vehicle } = await setup()
    const browser = await login()

    const form = await browser.page(urlFor('maintenances.create', { id: vehicle.id }))
    assert.equal(form.component, 'fiches/maintenances/form')
    assert.equal(form.props.mode, 'done')

    let response = await browser.submit(urlFor('maintenances.store', { id: vehicle.id }), {
      mode: 'done',
      kind: 'oil_change',
      doneOn: '2026-10-01',
      odometerKm: '101000',
      cost: '89,90',
      garage: 'Garage du coin',
    })
    assert.equal(response.status, 302)

    response = await browser.submit(urlFor('maintenances.store', { id: vehicle.id }), {
      mode: 'planned',
      kind: 'inspection',
      dueOn: '2027-03-12',
    })
    assert.equal(response.status, 302)

    const show = await browser.page(urlFor('vehicles.show', { id: vehicle.id }))
    const log = show.props.maintenances as VehicleMaintenances
    assert.equal(log.costCents, 8990)
    assert.deepEqual(
      log.history.map((row) => row.garage),
      ['Garage du coin']
    )
    assert.deepEqual(
      log.planned.map((row) => row.kind),
      ['inspection']
    )
  })

  test('a planned maintenance needs a date or a mileage', async ({ assert }) => {
    const { vehicle } = await setup()
    const browser = await login()

    await browser.submit(urlFor('maintenances.store', { id: vehicle.id }), {
      mode: 'planned',
      kind: 'inspection',
    })
    const page = await browser.page(urlFor('maintenances.create', { id: vehicle.id }))
    assert.properties(page.props.errors as object, ['dueOn'])
    assert.lengthOf(await Maintenance.query().where('vehicle_id', vehicle.id), 0)
  })

  test('marks a planned maintenance as done', async ({ assert }) => {
    const { maintenances, vehicle } = await setup()
    const planned = await maintenances.createPlanned(vehicle.id, {
      kind: 'brakes',
      dueOn: inDays(5),
    })
    const browser = await login()

    const page = await browser.page(urlFor('maintenances.completion', { id: planned.id }))
    assert.equal(page.component, 'fiches/maintenances/complete')

    const response = await browser.submit(urlFor('maintenances.complete', { id: planned.id }), {
      doneOn: inDays(0),
      cost: '180',
    })
    assert.equal(response.status, 302)
    await planned.refresh()
    assert.isNotNull(planned.doneOn)
    assert.equal(planned.costCents, 18_000)
  })
})
