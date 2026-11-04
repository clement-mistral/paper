import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Home from '#domains/maison/models/home'
import CircuitService from '#domains/maison/services/circuit_service'
import EquipmentMaintenanceService from '#domains/maison/services/equipment_maintenance_service'
import EquipmentService from '#domains/maison/services/equipment_service'
import HomeService from '#domains/maison/services/home_service'
import MeterService from '#domains/maison/services/meter_service'
import AgendaView from '#views/agenda_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { HomeDetail, MeterDetail } from '#shared/types/maison'

const inDays = (days: number) => toIsoDate(today().plus({ days }))

async function services() {
  return {
    homes: await app.container.make(HomeService),
    equipment: await app.container.make(EquipmentService),
    maintenances: await app.container.make(EquipmentMaintenanceService),
    circuits: await app.container.make(CircuitService),
    meters: await app.container.make(MeterService),
  }
}

async function login() {
  await User.create({ email: 'maison@paper.local', password: 'secret123' })
  const browser = new Browser()
  await browser.login('maison@paper.local', 'secret123')
  return browser
}

test.group('Maison | logement', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the fiche gathers equipment, circuits and meters', async ({ assert }) => {
    const { homes, equipment, circuits, meters } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    await equipment.create(home.id, {
      name: 'Chaudière',
      category: 'heating',
      warrantyUntil: inDays(100),
    })
    await equipment.create(home.id, {
      name: 'Lave-linge',
      category: 'appliance',
      warrantyUntil: inDays(-1),
    })
    await equipment.create(home.id, { name: 'VMC', category: 'ventilation' })
    for (const reference of ['C10', 'C2', 'C1']) {
      await circuits.create(home.id, { reference, label: `Circuit ${reference}` })
    }
    await meters.create(home.id, { kind: 'electricity', label: 'Linky' })

    const detail = await homes.detail(home.id)
    assert.deepEqual(
      detail.equipment.map((item) => [item.name, item.warrantyStatus]),
      [
        ['Chaudière', 'active'],
        ['Lave-linge', 'expired'],
        ['VMC', 'none'],
      ]
    )
    assert.deepEqual(
      detail.circuits.map((circuit) => circuit.reference),
      ['C1', 'C2', 'C10']
    )
    assert.equal(detail.meters[0].unit, 'kWh')
    assert.containsSubset(detail, { equipmentCount: 3, circuitCount: 3, meterCount: 1 })
  })

  test('a done maintenance is an expense and plans the next one', async ({ assert }) => {
    const { homes, equipment, maintenances } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const boiler = await equipment.create(home.id, { name: 'Chaudière', category: 'heating' })

    const done = await maintenances.createDone(boiler.id, {
      label: 'Entretien annuel',
      doneOn: '2026-10-15',
      costCents: 14_000,
      provider: 'Chauffagiste',
      intervalMonths: 12,
    })

    const expenses = await db
      .from('transactions')
      .where({ source_type: 'equipment_maintenance', source_id: done.id })
    assert.lengthOf(expenses, 1)
    assert.containsSubset(expenses[0], {
      amount_cents: -14_000,
      label: 'Entretien Chaudière · Entretien annuel',
      domain: 'maison',
    })

    const detail = await equipment.detail(boiler.id)
    assert.equal(detail.maintenances.costCents, 14_000)
    assert.lengthOf(detail.maintenances.history, 1)
    assert.lengthOf(detail.maintenances.planned, 1)
    assert.equal(detail.maintenances.planned[0].dueOn, '2027-10-15')
    assert.equal(detail.nextMaintenance?.dueOn, '2027-10-15')
  })

  test('« Marquer fait » completes a planned maintenance once', async ({ assert }) => {
    const { homes, equipment, maintenances } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const vmc = await equipment.create(home.id, { name: 'VMC', category: 'ventilation' })
    const planned = await maintenances.createPlanned(vmc.id, {
      label: 'Nettoyage des bouches',
      dueOn: inDays(-3),
      intervalMonths: 6,
    })
    const before = await maintenances.detail(planned.id)
    assert.equal(before.status, 'overdue')

    const { next } = await maintenances.complete(planned.id, { doneOn: inDays(0) })
    assert.equal(toIsoDate(next!.dueOn!), toIsoDate(today().plus({ months: 6 })))
    await assert.rejects(() => maintenances.complete(planned.id, { doneOn: inDays(0) }))
  })

  test('planned maintenances show in « Aujourd’hui »', async ({ assert }) => {
    const { homes, equipment, maintenances } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const boiler = await equipment.create(home.id, { name: 'Chaudière', category: 'heating' })
    await maintenances.createPlanned(boiler.id, { label: 'Ramonage', dueOn: inDays(1) })
    await maintenances.createPlanned(boiler.id, { label: 'Entretien annuel', dueOn: inDays(-2) })

    const agenda = await app.container.make(AgendaView)
    const overview = await agenda.today()
    const kind = (item: { kind: string }) => item.kind === 'equipment_maintenance'
    assert.deepEqual(
      overview.tomorrow.filter(kind).map((item) => item.title),
      ['Ramonage']
    )
    assert.deepEqual(
      overview.overdue.filter(kind).map((item) => item.detail),
      ['Chaudière · échéance dépassée']
    )
  })

  test('meter readings: consumption, daily average and monotonic index', async ({ assert }) => {
    const { homes, meters } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const meter = await meters.create(home.id, { kind: 'water', label: 'Eau' })

    await meters.addReading(meter.id, { readOn: '2026-09-01', value: 100 })
    await meters.addReading(meter.id, { readOn: '2026-10-01', value: 106 })
    await meters.addReading(meter.id, { readOn: '2026-10-01', value: 106.5 })

    const detail = await meters.detail(meter.id)
    assert.lengthOf(detail.readings, 2)
    assert.containsSubset(detail.lastReading, {
      value: 106.5,
      consumption: 6.5,
      days: 30,
      perDay: 0.22,
    })
    assert.isNull(detail.readings[1].consumption)

    await assert.rejects(() => meters.addReading(meter.id, { readOn: '2026-11-01', value: 90 }))
    await assert.rejects(() => meters.addReading(meter.id, { readOn: '2026-09-15', value: 110 }))
  })
})

test.group('Maison | logement pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('« Logement » opens the creation form, then the only home', async ({ assert }) => {
    const browser = await login()

    let response = await browser.request(urlFor('homes.index'))
    assert.equal(response.headers.get('location'), urlFor('homes.create'))
    const form = await browser.page(urlFor('homes.create'))
    assert.equal(form.component, 'fiches/homes/form')

    response = await browser.submit(urlFor('homes.store'), {
      name: 'Maison',
      kind: 'house',
      occupancy: 'owner',
    })
    const homeUrl = response.headers.get('location')!

    response = await browser.request(urlFor('homes.index'))
    assert.equal(response.headers.get('location'), homeUrl)
    response = await browser.request(urlFor('homes.create'))
    assert.equal(response.headers.get('location'), homeUrl)
  })

  test('a second home is never created', async ({ assert }) => {
    const { homes } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    await assert.rejects(() =>
      homes.create({ name: 'Autre', kind: 'apartment', occupancy: 'tenant' })
    )

    const browser = await login()
    const response = await browser.submit(urlFor('homes.store'), {
      name: 'Autre',
      kind: 'apartment',
      occupancy: 'tenant',
    })
    assert.equal(response.headers.get('location'), urlFor('homes.show', { id: home.id }))
    assert.lengthOf(await Home.all(), 1)
  })

  test('creates a home and fills it from its fiche', async ({ assert }) => {
    const browser = await login()

    let response = await browser.submit(urlFor('homes.store'), {
      name: 'Appartement',
      kind: 'apartment',
      occupancy: 'tenant',
      surfaceM2: '48,5',
    })
    assert.equal(response.status, 302)
    const homeUrl = response.headers.get('location')!
    const homeId = Number(homeUrl.split('/').pop())

    response = await browser.submit(urlFor('circuits.store', { id: homeId }), {
      reference: 'C1',
      label: 'Prises cuisine',
      breakerAmps: '20',
      sectionMm2: '2,5',
    })
    assert.equal(response.status, 302)

    response = await browser.submit(urlFor('equipment.store', { id: homeId }), {
      name: 'Chauffe-eau',
      category: 'water_heater',
      price: '450',
    })
    assert.equal(response.status, 302)

    response = await browser.submit(urlFor('meters.store', { id: homeId }), {
      kind: 'electricity',
      label: 'Linky',
    })
    const meterId = Number(response.headers.get('location')!.split('/').pop())
    response = await browser.submit(urlFor('meters.readings.store', { id: meterId }), {
      readOn: '2026-10-01',
      value: '12345,6',
    })
    assert.equal(response.status, 302)

    const page = await browser.page(homeUrl)
    assert.equal(page.component, 'fiches/homes/show')
    const home = page.props.home as HomeDetail
    assert.equal(home.surfaceM2, 48.5)
    assert.containsSubset(home.circuits[0], { breakerAmps: 20, sectionMm2: 2.5 })
    assert.equal(home.equipment[0].name, 'Chauffe-eau')
    assert.equal(home.meters[0].lastReading?.value, 12345.6)
  })

  test('a lower index is refused on the reading field', async ({ assert }) => {
    const { homes, meters } = await services()
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const meter = await meters.create(home.id, { kind: 'gas', label: 'Gaz' })
    await meters.addReading(meter.id, { readOn: '2026-10-01', value: 500 })
    const browser = await login()

    await browser.submit(urlFor('meters.readings.store', { id: meter.id }), {
      readOn: '2026-10-15',
      value: '400',
    })
    const page = await browser.page(urlFor('meters.show', { id: meter.id }))
    assert.properties(page.props.errors as object, ['value'])
    assert.lengthOf((page.props.meter as MeterDetail).readings, 1)
  })
})
