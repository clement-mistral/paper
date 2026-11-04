import { type DateTime } from 'luxon'
import type { Recurrence } from '#shared/types/lists'

/**
 * Next due date of a recurring task after `from`, moved forward until it
 * is not in the past (a task done late does not pile up occurrences).
 */
export function nextOccurrence(
  recurrence: Recurrence,
  interval: number,
  from: DateTime,
  today: DateTime
): DateTime {
  const step = Math.max(1, interval)
  const units = { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' } as const
  let next = from.plus({ [units[recurrence]]: step })
  while (next < today) next = next.plus({ [units[recurrence]]: step })
  return next
}
