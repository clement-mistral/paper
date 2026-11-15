import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  type Deadline,
  digestMessage,
  digestWindowOpen,
  stageOf,
  taskAlertDue,
  whenLabel,
} from '#domains/notifications/services/deadline_reminders'
import { HOME_ZONE } from '#support/dates'

const at = (iso: string) => DateTime.fromISO(iso, { zone: HOME_ZONE })
const day = at('2026-11-15T09:00')

function deadline(overrides: Partial<Deadline> = {}): Deadline {
  return {
    key: 'bill:1',
    date: '2026-11-22',
    title: 'Facture EDF',
    detail: '82,00 € à payer',
    href: '/fiches/factures/1',
    canBeLate: true,
    ...overrides,
  }
}

test.group('Notifications | deadline stages', () => {
  test('a few days before, the day before, the day itself', ({ assert }) => {
    const stage = (date: string, lead = 7) => stageOf(deadline({ date }), day, lead)?.stage ?? null
    assert.isNull(stage('2026-11-23'))
    assert.equal(stage('2026-11-22'), 'advance')
    assert.equal(stage('2026-11-17'), 'advance')
    assert.equal(stage('2026-11-16'), 'eve')
    assert.equal(stage('2026-11-15'), 'day')
    assert.equal(stage('2026-11-25', 10), 'advance')
    assert.equal(stageOf(deadline({ date: '2026-11-20' }), day, 7)?.days, 5)
  })

  test('late only for what can be late, and only for three days', ({ assert }) => {
    assert.equal(stageOf(deadline({ date: '2026-11-12' }), day, 7)?.stage, 'late')
    assert.isNull(stageOf(deadline({ date: '2026-11-11' }), day, 7))
    assert.isNull(stageOf(deadline({ date: '2026-11-14', canBeLate: false }), day, 7))
  })

  test('tasks are only reminded on their day', ({ assert }) => {
    const task = (date: string) => deadline({ date, dayOnly: true, canBeLate: false })
    assert.equal(stageOf(task('2026-11-15'), day, 7)?.stage, 'day')
    assert.isNull(stageOf(task('2026-11-16'), day, 7))
    assert.isNull(stageOf(task('2026-11-14'), day, 7))
  })

  test('a maintenance due by mileage follows its status', ({ assert }) => {
    const km = (status: Deadline['status'], date: string | null = null) =>
      stageOf(deadline({ key: 'maintenance:3', date, status }), day, 7)?.stage ?? null
    assert.equal(km('upcoming'), 'advance')
    assert.equal(km('overdue'), 'late')
    assert.isNull(km(undefined))
    // Dated, but already overdue by mileage long before the date.
    assert.equal(km('overdue', '2027-03-01'), 'late')
    assert.isNull(km('upcoming', '2027-03-01'))
  })

  test('says when in words', ({ assert }) => {
    assert.equal(whenLabel({ stage: 'day', days: 0 }), 'aujourd’hui')
    assert.equal(whenLabel({ stage: 'eve', days: 1 }), 'demain')
    assert.equal(whenLabel({ stage: 'advance', days: 7 }), 'dans 7 jours')
    assert.equal(whenLabel({ stage: 'advance', days: null }), 'bientôt')
    assert.equal(whenLabel({ stage: 'late', days: -2 }), 'en retard de 2 j')
  })
})

test.group('Notifications | deadline digest', () => {
  test('a single deadline is the notification itself', ({ assert }) => {
    const message = digestMessage([{ deadline: deadline(), stage: 'eve', days: 1 }], '/agenda')
    assert.deepEqual(message, {
      title: 'Facture EDF',
      body: 'Demain · 82,00 € à payer',
      url: '/fiches/factures/1',
      tag: 'echeances',
    })
  })

  test('several deadlines: one list, the most urgent first, capped', ({ assert }) => {
    const message = digestMessage(
      [
        { deadline: deadline({ title: 'Garantie lave-linge' }), stage: 'advance', days: 6 },
        { deadline: deadline({ title: 'Contrôle technique Clio' }), stage: 'advance', days: 3 },
        { deadline: deadline({ title: 'Facture Free' }), stage: 'late', days: -1 },
        { deadline: deadline({ title: 'Appeler le plombier' }), stage: 'day', days: 0 },
        { deadline: deadline({ title: 'Préavis « Box »' }), stage: 'eve', days: 1 },
        { deadline: deadline({ title: 'Vidange' }), stage: 'advance', days: 7 },
      ],
      '/agenda'
    )
    assert.equal(message.title, '6 échéances')
    assert.equal(message.url, '/agenda')
    assert.deepEqual(message.body.split('\n'), [
      'Facture Free : en retard de 1 j',
      'Appeler le plombier : aujourd’hui',
      'Préavis « Box » : demain',
      'Contrôle technique Clio : dans 3 jours',
      'et 2 autres',
    ])
  })
})

test.group('Notifications | reminder windows', () => {
  test('the digest is sent from the chosen time until 22:00', ({ assert }) => {
    assert.isFalse(digestWindowOpen('09:00', at('2026-11-15T08:59')))
    assert.isTrue(digestWindowOpen('09:00', at('2026-11-15T09:00')))
    assert.isTrue(digestWindowOpen('09:00', at('2026-11-15T21:59')))
    assert.isFalse(digestWindowOpen('09:00', at('2026-11-15T22:00')))
    assert.isTrue(digestWindowOpen('22:30', at('2026-11-15T23:00')))
    assert.isFalse(digestWindowOpen('22:30', at('2026-11-15T23:30')))
  })

  test('a timed task is announced 15 minutes before, until 30 minutes after', ({ assert }) => {
    assert.isFalse(taskAlertDue('2026-11-15', '14:00', at('2026-11-15T13:44')))
    assert.isTrue(taskAlertDue('2026-11-15', '14:00', at('2026-11-15T13:45')))
    assert.isTrue(taskAlertDue('2026-11-15', '14:00', at('2026-11-15T14:29')))
    assert.isFalse(taskAlertDue('2026-11-15', '14:00', at('2026-11-15T14:30')))
    assert.isFalse(taskAlertDue('2026-11-16', '14:00', at('2026-11-15T13:50')))
  })
})
