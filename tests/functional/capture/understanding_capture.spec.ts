import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CaptureService from '#capture/capture_service'
import UndoService from '#capture/services/undo_service'
import Transaction from '#domains/budget/models/transaction'
import EnvelopeService from '#domains/budget/services/envelope_service'
import Task from '#domains/lists/models/task'
import AutomaticTasks from '#domains/lists/services/automatic_tasks'
import TaskService from '#domains/lists/services/task_service'
import Bill from '#domains/maison/models/bill'
import BillService from '#domains/maison/services/bill_service'
import MealPlan from '#domains/menu/models/meal_plan'
import Recipe from '#domains/menu/models/recipe'
import AgendaView from '#views/agenda_view'
import { today, toIsoDate } from '#support/dates'
import type { CapturePreview } from '#shared/types/capture'

function status(preview: CapturePreview) {
  return preview.status === 'ready' || preview.status === 'incomplete'
    ? preview.intent.name
    : preview.status
}

test.group('Understanding | tasks', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('captures a task with a checklist', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)

    const preview = await capture.preview({ text: 'préparer les vacances : valises, passeports' })
    assert.equal(status(preview), 'task')

    await capture.commit({ text: 'préparer les vacances : valises, passeports' })
    const task = await Task.query().preload('items').firstOrFail()
    assert.equal(task.title, 'Préparer les vacances')
    assert.deepEqual(
      task.items.map((item) => item.label),
      ['Valises', 'Passeports']
    )
  })

  test('checking a recurring task schedules the next one', async ({ assert }) => {
    const tasks = await app.container.make(TaskService)
    const task = await tasks.create({
      title: 'Sortir les poubelles',
      dueOn: toIsoDate(today()),
      recurrence: 'weekly',
      items: ['Jaune', 'Verte'],
    })

    const next = await tasks.complete(task.id)

    assert.equal(toIsoDate(next!.dueOn!), toIsoDate(today().plus({ weeks: 1 })))
    await next!.load('items')
    assert.lengthOf(next!.items, 2)
    assert.isTrue(next!.items.every((item) => !item.isDone))
  })

  test('automatic tasks follow bills and draft recipes', async ({ assert }) => {
    const bills = await app.container.make(BillService)
    const sync = await app.container.make(AutomaticTasks)
    const bill = await bills.create({
      provider: 'EDF',
      amountCents: 8420,
      dueOn: toIsoDate(today().plus({ days: 2 })),
    })
    await bills.create({
      provider: 'Eau',
      amountCents: 3200,
      dueOn: toIsoDate(today().plus({ days: 20 })),
    })
    await Recipe.create({ name: 'Raclette', servings: 6, isDraft: true })

    await sync.sync()
    await sync.sync()

    const open = await Task.query().whereNull('done_at').orderBy('title')
    assert.deepEqual(
      open.map((task) => task.title.replace(/\s/g, ' ')),
      ['Compléter la recette « Raclette »', 'Payer la facture EDF (84,20 €)']
    )

    await bills.markPaid(bill.id)
    await sync.sync()
    const paidTask = await Task.findByOrFail('source_id', bill.id)
    assert.isNotNull(paidTask.doneAt)
  })
})

test.group('Understanding | switch, learn, multiple, undo', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a recurrence alone makes a task', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const preview = await capture.preview({ text: 'sortir les poubelles tous les mardis' })
    assert.equal(status(preview), 'task')
  })

  test('a dated short phrase is a task, and the user can switch type', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)

    const preview = await capture.preview({ text: 'dentiste jeudi 9h30' })
    assert.equal(status(preview), 'task')
    assert.isTrue(
      preview.status === 'ready' && preview.alternatives.some((info) => info.name === 'meal')
    )
  })

  test('remembers the intent the user picked', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    assert.equal(status(await capture.preview({ text: 'tartiflette samedi' })), 'task')

    await capture.commit({ text: 'tartiflette samedi', intent: 'meal' })

    assert.equal(status(await capture.preview({ text: 'tartiflette dimanche' })), 'meal')
  })

  test('splits several captures and commits them together', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const text = 'café 3 € et appeler le plombier demain 14h'

    const preview = await capture.preview({ text })
    assert.equal(preview.status, 'multiple')
    assert.deepEqual(
      preview.status === 'multiple' ? preview.segments.map((s) => s.preview.intent.name) : [],
      ['expense', 'task']
    )

    const receipt = await capture.commit({ text })
    assert.lengthOf(await Transaction.all(), 1)
    assert.lengthOf(await Task.all(), 1)
    assert.include(receipt.message, '2 saisies')
  })

  test('keeps a list of items as one capture', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const preview = await capture.preview({ text: 'ajoute du lait et des oeufs aux courses' })
    assert.equal(status(preview), 'shopping_item')
  })

  test('undoes a capture and everything it created', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const undo = await app.container.make(UndoService)

    const receipt = await capture.commit({
      text: 'raclette samedi soir pour 6 ; facture eau 32 € payée',
    })
    assert.lengthOf(await MealPlan.all(), 1)
    assert.lengthOf(await Bill.all(), 1)
    assert.lengthOf(await Transaction.all(), 1)

    await undo.undo(receipt.id)

    assert.lengthOf(await MealPlan.all(), 0)
    assert.lengthOf(await Recipe.all(), 0)
    assert.lengthOf(await Bill.all(), 0)
    assert.lengthOf(await Transaction.all(), 0)
    await assert.rejects(() => undo.undo(receipt.id))
  })

  test('understands spelled numbers', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const preview = await capture.preview({ text: 'resto vingt-cinq euros' })
    assert.equal(
      preview.status === 'ready'
        ? preview.fields.find((f) => f.key === 'amountCents')?.value
        : null,
      2500
    )
  })
})

test.group('Understanding | questions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('answers a spending question without writing', async ({ assert }) => {
    const envelopes = await app.container.make(EnvelopeService)
    await envelopes.create({ name: 'Resto', monthlyBudget: 10000 })
    const capture = await app.container.make(CaptureService)
    await capture.commit({ text: 'resto 32 €' })
    await capture.commit({ text: 'resto 18 €' })

    const preview = await capture.preview({ text: 'combien en resto ce mois ?' })

    assert.equal(preview.status, 'answer')
    if (preview.status !== 'answer') return
    assert.equal(preview.answer.title, 'Resto · ce mois-ci')
    assert.equal(preview.answer.lines[0].value.replace(/\s/g, ' '), '50,00 €')
    assert.equal(preview.answer.lines[2].value.replace(/\s/g, ' '), '50,00 €')
    assert.lengthOf(await Transaction.all(), 2)
  })

  test('answers what is for dinner', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    await capture.commit({ text: 'raclette ce soir' })

    const preview = await capture.preview({ text: 'on mange quoi ce soir ?' })

    assert.equal(preview.status, 'answer')
    if (preview.status !== 'answer') return
    assert.include(preview.answer.lines[0].value, 'Raclette')
  })

  test('lists unpaid bills', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    await capture.commit({ text: 'facture EDF 84,20 € le 15' })

    const preview = await capture.preview({ text: 'quelles factures à payer ?' })

    assert.equal(preview.status, 'answer')
    if (preview.status !== 'answer') return
    assert.include(preview.answer.lines[0].label, 'EDF')
  })
})

test.group('Views | today and agenda', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('gathers tasks, meals, bills and debits by day', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    await capture.commit({ text: 'appeler le plombier demain 14h' })
    await capture.commit({ text: 'raclette ce soir' })
    await capture.commit({ text: `netflix 13,49 € par mois le ${today().plus({ days: 1 }).day}` })
    await db.table('tasks').insert({
      title: 'Vieille tâche',
      due_on: toIsoDate(today().minus({ days: 3 })),
      recurrence_interval: 1,
      created_at: new Date(),
    })

    const agenda = await app.container.make(AgendaView)
    const overview = await agenda.today()

    assert.deepEqual(
      overview.overdue.map((item) => item.title),
      ['Vieille tâche']
    )
    assert.deepEqual(
      overview.today.map((item) => item.kind),
      ['meal']
    )
    assert.sameMembers(
      overview.tomorrow.map((item) => item.kind),
      ['task', 'subscription']
    )
  })
})
