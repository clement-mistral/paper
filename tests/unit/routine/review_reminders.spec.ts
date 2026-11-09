import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { dueReminder, reminderMessage } from '#domains/routine/services/review_reminders'
import { HOME_ZONE } from '#support/dates'
import type { DailyReview } from '#shared/types/routine'

const at = (iso: string) => DateTime.fromISO(iso, { zone: HOME_ZONE })

const state = {
  eveningEnabled: true,
  eveningTime: '21:00',
  morningEnabled: true,
  eveningSentOn: null,
  morningSentOn: null,
}
const todayDue = {
  todayCompleted: false,
  due: { day: '2026-11-09', label: 'today' as const, deadline: '' },
}
const yesterdayDue = {
  todayCompleted: false,
  due: { day: '2026-11-08', label: 'yesterday' as const, deadline: '' },
}

test.group('Routine | review reminders', () => {
  test('the evening reminder starts at the chosen time, once a day', ({ assert }) => {
    assert.isNull(dueReminder(at('2026-11-09T20:59'), state, todayDue))
    assert.equal(dueReminder(at('2026-11-09T21:00'), state, todayDue), 'evening')
    assert.equal(dueReminder(at('2026-11-09T23:40'), state, todayDue), 'evening')
    assert.isNull(
      dueReminder(at('2026-11-09T21:05'), { ...state, eveningSentOn: '2026-11-09' }, todayDue)
    )
    assert.equal(
      dueReminder(at('2026-11-09T21:05'), { ...state, eveningSentOn: '2026-11-08' }, todayDue),
      'evening'
    )
    assert.equal(
      dueReminder(at('2026-11-09T19:30'), { ...state, eveningTime: '19:30' }, todayDue),
      'evening'
    )
  })

  test('no evening reminder once the day is validated or when disabled', ({ assert }) => {
    const done = { todayCompleted: true, due: null }
    assert.isNull(dueReminder(at('2026-11-09T21:30'), state, done))
    assert.isNull(
      dueReminder(at('2026-11-09T21:30'), { ...state, eveningEnabled: false }, todayDue)
    )
  })

  test('the morning reminder only while yesterday is waiting, 10:00 to noon', ({ assert }) => {
    assert.isNull(dueReminder(at('2026-11-09T09:59'), state, yesterdayDue))
    assert.equal(dueReminder(at('2026-11-09T10:00'), state, yesterdayDue), 'morning')
    assert.equal(dueReminder(at('2026-11-09T11:59'), state, yesterdayDue), 'morning')
    assert.isNull(dueReminder(at('2026-11-09T12:00'), state, yesterdayDue))
    assert.isNull(dueReminder(at('2026-11-09T10:30'), state, todayDue))
    assert.isNull(
      dueReminder(at('2026-11-09T10:30'), { ...state, morningSentOn: '2026-11-09' }, yesterdayDue)
    )
    assert.isNull(
      dueReminder(at('2026-11-09T10:30'), { ...state, morningEnabled: false }, yesterdayDue)
    )
  })

  test('the message says what is left and opens the review', ({ assert }) => {
    const review = {
      day: '2026-11-09',
      moneyConfirmed: false,
      tasks: { open: [{}, {}, {}], closed: [] },
      meals: [{ outcome: null }, { outcome: 'cooked' }],
    } as unknown as DailyReview

    assert.deepEqual(reminderMessage('evening', review, 12), {
      title: 'Bilan du soir',
      body: 'À trier : l’argent du jour, 3 tâches et 1 repas. Série en cours : 12 j.',
      url: '/bilan/2026-11-09',
      tag: 'bilan',
    })

    const ready = { ...review, moneyConfirmed: true, tasks: { open: [], closed: [] }, meals: [] }
    assert.equal(reminderMessage('evening', ready, 0).body, 'Tout est prêt, il reste à valider.')

    const morning = reminderMessage('morning', { ...ready, day: '2026-11-08' }, 4)
    assert.equal(morning.title, 'Bilan d’hier')
    assert.equal(
      morning.body,
      'Encore possible jusqu’à midi pour garder votre série de 4 j. Tout est prêt, il reste à valider.'
    )
    assert.equal(morning.url, '/bilan/2026-11-08')
  })
})
