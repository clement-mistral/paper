import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { isOpen, streaks } from '#domains/routine/services/review_window'
import { HOME_ZONE } from '#support/dates'

const at = (iso: string) => DateTime.fromISO(iso, { zone: HOME_ZONE })

test.group('Routine | review window', () => {
  test('a day stays open until noon the next day', ({ assert }) => {
    const day = at('2026-11-02')
    assert.isTrue(isOpen(day, at('2026-11-02T08:00')))
    assert.isTrue(isOpen(day, at('2026-11-02T23:59')))
    assert.isTrue(isOpen(day, at('2026-11-03T11:59')))
    assert.isFalse(isOpen(day, at('2026-11-03T12:00')))
    assert.isFalse(isOpen(day, at('2026-11-01T23:00')))
  })
})

test.group('Routine | streaks', () => {
  const today = at('2026-11-10')

  test('counts consecutive days ending today', ({ assert }) => {
    const days = new Set(['2026-11-08', '2026-11-09', '2026-11-10'])
    assert.deepEqual(streaks(days, today), { current: 3, best: 3 })
  })

  test('today not done yet keeps the streak ending yesterday', ({ assert }) => {
    const days = new Set(['2026-11-08', '2026-11-09'])
    assert.equal(streaks(days, today).current, 2)
  })

  test('a missed day breaks the streak but keeps the record', ({ assert }) => {
    const days = new Set([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-09',
      '2026-11-10',
    ])
    assert.deepEqual(streaks(days, today), { current: 2, best: 4 })
  })

  test('nothing done', ({ assert }) => {
    assert.deepEqual(streaks(new Set(), today), { current: 0, best: 0 })
  })
})
