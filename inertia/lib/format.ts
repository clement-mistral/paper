/**
 * French formatting helpers. Every amount, date and quantity displayed in
 * the UI goes through this module. Amounts arrive from the server in cents.
 */

const LOCALE = 'fr-FR'

const currency = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR' })
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })
const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

type DateInput = Date | string

function toDate(value: DateInput): Date {
  return typeof value === 'string' ? new Date(value) : value
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** 163240 → « 1 632,40 € » */
export function formatAmount(cents: number): string {
  return currency.format(cents / 100)
}

/** 142380 → « 142 380 » */
export function formatNumber(value: number): string {
  return integer.format(value)
}

/** 142380 → « 142 380 km » */
export function formatKm(value: number): string {
  return `${integer.format(value)}\u202Fkm`
}

/** 38.2 → « 38,2 L » */
export function formatLiters(value: number): string {
  return `${decimal.format(value)}\u202FL`
}

/** → « 28/10/2026 » */
export function formatDate(value: DateInput): string {
  const date = toDate(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** → « Mer. 28 » */
export function formatShortDay(value: DateInput): string {
  const date = toDate(value)
  const day = weekday.format(date).replace('.', '')
  return `${capitalize(day)}. ${date.getDate()}`
}

/** → « Mercredi 28 octobre » */
export function formatLongDate(value: DateInput): string {
  return capitalize(longDate.format(toDate(value)))
}

/** 120050 → « 1200,50 » (editable, no thousands separator) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** 1.5 → « 1,5 » */
export function formatDecimal(value: number): string {
  return decimal.format(value)
}

/** Minutes → « 1 h 15 », « 25 min » */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

/** Local calendar day, `YYYY-MM-DD` (not UTC). */
export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** 72.5 → « 72,5 » (editable decimal input) */
export function decimalToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',')
}

const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' })
const monthLong = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** `2026-11` → « nov. » */
export function formatMonthShort(month: string): string {
  return monthShort.format(new Date(`${month}-01T00:00:00Z`))
}

/** `2026-11` → « Novembre 2026 » */
export function formatMonthLong(month: string): string {
  const label = monthLong.format(new Date(`${month}-01T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** `2026-11-04` → « 4 nov. » */
export function formatDayMonth(date: string): string {
  return dayMonth.format(new Date(`${date}T00:00:00Z`))
}

const compactEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const wholeEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** Axis ticks: « 250 € », « 1 500 € », « 12 k€ » past 10 000 €. */
export function formatAxisAmount(cents: number): string {
  const euros = cents / 100
  return Math.abs(euros) >= 10_000 ? compactEuros.format(euros) : wholeEuros.format(euros)
}

const twoDecimals = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1.9 → « 1,90 » (prices per unit) */
export function formatPrice(value: number): string {
  return twoDecimals.format(value)
}

const fullDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const clock = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

/** `2026-11-04` → « Mercredi 4 novembre 2026 » */
export function formatFullDate(day: string): string {
  return capitalize(fullDate.format(new Date(`${day}T00:00:00Z`)))
}

/** ISO timestamp → « 08:15 » in Paris */
export function formatClock(value: string): string {
  return clock.format(new Date(value))
}

/** Shifts a `YYYY-MM-DD` day by `days`. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
