import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CaptureService from '#capture/capture_service'
import UndoService from '#capture/services/undo_service'
import Maintenance from '#domains/auto/models/maintenance'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import Task from '#domains/lists/models/task'
import HomeService from '#domains/maison/services/home_service'
import MeterService from '#domains/maison/services/meter_service'
import ProjectService from '#domains/maison/services/project_service'
import { toIsoDate, today } from '#support/dates'
import type { CapturePreview } from '#shared/types/capture'

const intentOf = (preview: CapturePreview) =>
  preview.status === 'ready' || preview.status === 'incomplete'
    ? preview.intent.name
    : preview.status

test.group('Capture | household', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('« vidange 89 € 101 000 km » completes the planned oil change', async ({ assert }) => {
    const vehicles = await app.container.make(VehicleService)
    const maintenances = await app.container.make(MaintenanceService)
    const capture = await app.container.make(CaptureService)
    const clio = await vehicles.create({ name: 'Clio', fuel: 'e10', initialOdometerKm: 95_000 })
    const planned = await maintenances.createPlanned(clio.id, {
      kind: 'oil_change',
      dueOdometerKm: 100_000,
      intervalKm: 15_000,
    })

    const preview = await capture.preview({ text: 'vidange 89 € 101 000 km' })
    assert.equal(intentOf(preview), 'maintenance')

    const receipt = await capture.commit({ text: 'vidange 89 € 101 000 km' })
    await planned.refresh()
    assert.isNotNull(planned.doneOn)
    assert.equal(planned.costCents, 8_900)
    const next = await Maintenance.query().where('vehicle_id', clio.id).whereNull('done_on')
    assert.equal(next[0].dueOdometerKm, 116_000)

    const undo = await app.container.make(UndoService)
    await undo.undo(receipt.id)
    await planned.refresh()
    assert.isNull(planned.doneOn, 'planned again')
    assert.lengthOf(await Maintenance.query().where('vehicle_id', clio.id), 1, 'next removed')
    const expenses = await db.from('transactions').where('source_type', 'maintenance')
    assert.lengthOf(expenses, 0)
  })

  test('« plein 38 L 67 € » stays a fill-up, « prévoir la vidange » a task', async ({ assert }) => {
    const vehicles = await app.container.make(VehicleService)
    const capture = await app.container.make(CaptureService)
    await vehicles.create({ name: 'Clio', fuel: 'e10' })
    assert.equal(intentOf(await capture.preview({ text: 'plein 38 L 67 €' })), 'fuel')
    assert.equal(intentOf(await capture.preview({ text: 'prévoir la vidange vendredi' })), 'task')
  })

  test('« relevé eau 1234 » is a reading, undone on demand', async ({ assert }) => {
    const homes = await app.container.make(HomeService)
    const meters = await app.container.make(MeterService)
    const capture = await app.container.make(CaptureService)
    const home = await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    await meters.create(home.id, { kind: 'electricity', label: 'Linky' })
    const water = await meters.create(home.id, { kind: 'water', label: 'Eau' })

    assert.equal(intentOf(await capture.preview({ text: 'relevé eau 1234' })), 'meter_reading')
    const receipt = await capture.commit({ text: 'relevé eau 1234' })
    let detail = await meters.detail(water.id)
    assert.equal(detail.lastReading?.value, 1234)
    assert.equal(detail.lastReading?.readOn, toIsoDate(today()))

    const undo = await app.container.make(UndoService)
    await undo.undo(receipt.id)
    detail = await meters.detail(water.id)
    assert.isNull(detail.lastReading)

    assert.equal(intentOf(await capture.preview({ text: 'eau 30 €' })), 'expense')
  })

  test('« travaux peinture chambre 45 € » is a project expense', async ({ assert }) => {
    const homes = await app.container.make(HomeService)
    const projects = await app.container.make(ProjectService)
    const capture = await app.container.make(CaptureService)
    await homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
    const project = await projects.create({ title: 'Repeindre la chambre', status: 'in_progress' })

    const preview = await capture.preview({ text: 'travaux peinture chambre 45 €' })
    assert.equal(intentOf(preview), 'project_expense')
    await capture.commit({ text: 'travaux peinture chambre 45 €' })
    const detail = await projects.detail(project.id)
    assert.equal(detail.spentCents, 4_500)
    assert.equal(detail.expenses[0].label, 'Travaux Repeindre la chambre · Peinture')
  })

  test('a recurring chore lands in « Ménage »', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    await capture.commit({ text: 'passer l’aspirateur tous les samedis' })
    await capture.commit({ text: 'appeler le plombier lundi' })
    const tasks = await Task.query().orderBy('id')
    assert.deepEqual(
      tasks.map((task) => [task.isChore, task.domain]),
      [
        [true, 'maison'],
        [false, 'maison'],
      ]
    )
  })
})
