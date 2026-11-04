import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import CaptureService from '#capture/capture_service'
import Transaction from '#domains/budget/models/transaction'
import EnvelopeService from '#domains/budget/services/envelope_service'
import Task from '#domains/lists/models/task'
import TaskService from '#domains/lists/services/task_service'
import DailyReview from '#domains/routine/models/daily_review'
import RoutineService from '#domains/routine/services/routine_service'
import { today, toIsoDate } from '#support/dates'

test.group('Routine | daily review', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('gathers the day and lists what blocks the validation', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const routine = await app.container.make(RoutineService)
    await capture.commit({ text: 'café 3 €' })
    await capture.commit({ text: 'appeler le plombier aujourd’hui' })
    await capture.commit({ text: 'raclette ce soir' })

    const review = await routine.review(toIsoDate(today()))

    assert.isTrue(review.open)
    assert.equal(review.spentCents, 300)
    assert.lengthOf(review.tasks.open, 1)
    assert.lengthOf(review.meals, 1)
    assert.deepEqual(review.pending, ['money', 'tasks', 'meals'])
    await assert.rejects(() => routine.complete(toIsoDate(today())))
  })

  test('completes the day once everything is reviewed', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const routine = await app.container.make(RoutineService)
    const tasks = await app.container.make(TaskService)
    const envelopes = await app.container.make(EnvelopeService)
    const resto = await envelopes.create({ name: 'Resto' })
    const day = toIsoDate(today())

    await capture.commit({ text: 'appeler le plombier aujourd’hui' })
    await capture.commit({ text: 'ranger le garage aujourd’hui' })
    await capture.commit({ text: 'raclette ce soir' })
    const [first, second] = await Task.query().orderBy('id')

    await routine.confirmMoney(day)
    await tasks.postpone(first.id, 'tomorrow', day)
    await tasks.cancel(second.id)
    const review = await routine.review(day)
    await routine.mealOutcome(day, review.meals[0].id, 'eaten_out', 2450)

    const streak = await routine.complete(day)

    assert.equal(streak.current, 1)
    await first.refresh()
    assert.equal(toIsoDate(first.dueOn!), toIsoDate(today().plus({ days: 1 })))
    const dinner = await Transaction.findByOrFail('source_type', 'meal_plan')
    assert.equal(dinner.amountCents, -2450)
    assert.equal(dinner.envelopeId, resto.id)
    const after = await routine.review(day)
    assert.isTrue(after.completed)
    assert.isFalse(after.open)
    await assert.rejects(() => routine.confirmMoney(day))
  })

  test('changing a meal outcome replaces the restaurant expense', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const routine = await app.container.make(RoutineService)
    const day = toIsoDate(today())
    await capture.commit({ text: 'raclette ce soir' })
    const review = await routine.review(day)
    const [meal] = review.meals

    await routine.mealOutcome(day, meal.id, 'eaten_out', 3000)
    await routine.mealOutcome(day, meal.id, 'cooked')

    assert.lengthOf(await Transaction.query().where('source_type', 'meal_plan'), 0)
  })

  test('a day older than yesterday noon is locked', async ({ assert }) => {
    const routine = await app.container.make(RoutineService)
    const old = toIsoDate(today().minus({ days: 2 }))
    await assert.rejects(() => routine.confirmMoney(old))
  })

  test('the forgotten expense is dated on the review day', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)
    const yesterday = toIsoDate(today().minus({ days: 1 }))

    await capture.commit({
      text: 'boulangerie 3,20',
      intent: 'expense',
      overrides: { occurredOn: yesterday },
    })

    const [row] = await Transaction.all()
    assert.equal(toIsoDate(row.occurredOn), yesterday)
  })

  test('the status asks for yesterday until noon when the streak runs', async ({ assert }) => {
    const routine = await app.container.make(RoutineService)
    const twoDaysAgo = today().minus({ days: 2 })
    await DailyReview.create({ day: twoDaysAgo, moneyConfirmed: true, completedAt: DateTime.now() })

    const morning = await routine.status(today().set({ hour: 9 }))
    assert.equal(morning.due?.label, 'yesterday')
    assert.equal(morning.streak, 0)

    const afternoon = await routine.status(today().set({ hour: 15 }))
    assert.equal(afternoon.due?.label, 'today')
    assert.isFalse(afternoon.evening)
  })
})
