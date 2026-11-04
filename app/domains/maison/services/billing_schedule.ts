import { type DateTime } from 'luxon'
import type { Frequency } from '#shared/types/maison'

/**
 * First debit date on or after `from`. The billing day is clamped to the
 * end of short months (a « 31 » is debited on 30/04).
 */
export function nextBillingDate(
  frequency: Frequency,
  billingDay: number,
  billingMonth: number | null,
  from: DateTime
): DateTime {
  const start = from.startOf('day')

  if (frequency === 'yearly') {
    const month = billingMonth ?? start.month
    let candidate = clampDay(start.set({ month, day: 1 }), billingDay)
    if (candidate < start)
      candidate = clampDay(start.set({ month, day: 1 }).plus({ years: 1 }), billingDay)
    return candidate
  }

  let candidate = clampDay(start.startOf('month'), billingDay)
  if (candidate < start)
    candidate = clampDay(start.startOf('month').plus({ months: 1 }), billingDay)
  return candidate
}

function clampDay(monthStart: DateTime, day: number): DateTime {
  return monthStart.set({ day: Math.min(day, monthStart.daysInMonth ?? 28) })
}

/**
 * Monthly cost of a subscription, a yearly price spread over 12 months.
 */
export function monthlyCost(priceCents: number, frequency: Frequency): number {
  return frequency === 'yearly' ? Math.round(priceCents / 12) : priceCents
}
