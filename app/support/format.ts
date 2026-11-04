import { type DateTime } from 'luxon'

/**
 * Server-side twin of `inertia/lib/format.ts`, used for the texts built by
 * the server (capture preview effects, flash messages).
 */

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formatAmount(cents: number): string {
  return currency.format(cents / 100)
}

export function formatDate(value: DateTime): string {
  return value.toFormat('dd/LL/yyyy')
}

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

export function formatNumber(value: number): string {
  return decimal.format(value)
}

export function formatKm(value: number): string {
  return `${integer.format(value)}\u202Fkm`
}

export function formatLiters(value: number): string {
  return `${decimal.format(value)}\u202FL`
}

/** → « Jeudi 5 novembre » */
export function formatLongDate(value: DateTime): string {
  const text = value.setLocale('fr').toFormat('cccc d LLLL')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const slotLabels = { lunch: 'midi', dinner: 'soir' } as const

export const frequencyLabels = { monthly: 'mois', yearly: 'an' } as const

export const fuelLabels = {
  sp95: 'SP95',
  sp98: 'SP98',
  e10: 'SP95-E10',
  e85: 'E85',
  diesel: 'Gazole',
  lpg: 'GPL',
  electric: 'Électrique',
} as const
