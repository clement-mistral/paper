import { type DateTime } from 'luxon'

/**
 * The review of a day can be completed during that day and until noon
 * the next day. After that the day is locked and the streak is broken.
 */
export const GRACE_HOUR = 12

/**
 * From this hour the review of today is put forward.
 */
export const EVENING_HOUR = 18

/**
 * From this hour, a reminder is sent when yesterday's review is still
 * waiting (until the noon deadline).
 */
export const MORNING_HOUR = 10

export function deadlineOf(day: DateTime): DateTime {
  return day.startOf('day').plus({ days: 1 }).set({ hour: GRACE_HOUR })
}

export function isOpen(day: DateTime, now: DateTime): boolean {
  const start = day.startOf('day')
  return now >= start && now < deadlineOf(day)
}

/**
 * Current streak and best one from the completed days (ISO dates). The
 * current streak may end yesterday while today is still to be done.
 */
export function streaks(
  completed: Set<string>,
  today: DateTime
): { current: number; best: number } {
  let current = 0
  let cursor = completed.has(today.toISODate()!) ? today : today.minus({ days: 1 })
  while (completed.has(cursor.toISODate()!)) {
    current++
    cursor = cursor.minus({ days: 1 })
  }

  let best = 0
  let run = 0
  let previous: DateTime | null = null
  for (const day of [...completed].sort()) {
    const date = today.set({
      year: Number(day.slice(0, 4)),
      month: Number(day.slice(5, 7)),
      day: Number(day.slice(8, 10)),
    })
    run = previous && date.diff(previous, 'days').days === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = date
  }

  return { current, best: Math.max(best, current) }
}
