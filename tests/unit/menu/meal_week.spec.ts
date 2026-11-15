import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { proposeDinners, weekStart } from '#views/meal_week_view'
import { HOME_ZONE } from '#support/dates'

const recipe = (id: number) => ({
  recipe: { id, name: `Recette ${id}`, servings: 2 },
  reasons: [`raison ${id}`],
})

test.group('Menu | week of meals', () => {
  test('a week starts on Monday', ({ assert }) => {
    const sunday = DateTime.fromISO('2026-11-22', { zone: HOME_ZONE })
    assert.equal(weekStart(sunday).toISODate(), '2026-11-16')
    assert.equal(weekStart(sunday.plus({ days: 1 })).toISODate(), '2026-11-23')
  })

  test('each empty dinner gets the next best recipe, never one already planned', ({ assert }) => {
    const proposals = proposeDinners(
      ['2026-11-17', '2026-11-18', '2026-11-19'],
      [recipe(1), recipe(2), recipe(3), recipe(4)],
      new Set([2])
    )
    assert.deepEqual(
      [...proposals].map(([day, proposal]) => [day, proposal.recipe.id]),
      [
        ['2026-11-17', 1],
        ['2026-11-18', 3],
        ['2026-11-19', 4],
      ]
    )
  })

  test('fewer recipes than days: the last days stay empty', ({ assert }) => {
    const proposals = proposeDinners(['2026-11-17', '2026-11-18'], [recipe(1)], new Set())
    assert.deepEqual([...proposals.keys()], ['2026-11-17'])
  })
})
