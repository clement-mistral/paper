import { test } from '@japa/runner'
import { consumptionBetween, indexAt } from '#domains/maison/services/meter_service'

const readings = [
  { readOn: '2026-09-01', value: 1000 },
  { readOn: '2026-10-01', value: 1300 },
  { readOn: '2026-10-16', value: 1450 },
]

test.group('Maison | meter consumption', () => {
  test('an exact reading is used as is', ({ assert }) => {
    assert.deepEqual(indexAt(readings, '2026-10-01'), { value: 1300, exact: true })
  })

  test('between two readings, the index is interpolated', ({ assert }) => {
    // 2026-09-16 is 15 of the 30 days between the first two readings.
    assert.deepEqual(indexAt(readings, '2026-09-16'), { value: 1150, exact: false })
  })

  test('outside the readings there is no index', ({ assert }) => {
    assert.isNull(indexAt(readings, '2026-08-15'))
    assert.isNull(indexAt(readings, '2026-11-01'))
  })

  test('a month covered by exact readings is not an estimate', ({ assert }) => {
    assert.deepEqual(consumptionBetween(readings, '2026-09-01', '2026-10-01'), {
      value: 300,
      estimated: false,
    })
  })

  test('a month not covered to its end has no consumption', ({ assert }) => {
    assert.isNull(consumptionBetween(readings, '2026-10-01', '2026-11-01'))
  })
})
