import type { AccountType } from '#shared/types/budget'

export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Courant',
  savings: 'Épargne',
  investment: 'Placement',
}

/** « +12,3 % », « −4,0 % » */
export function formatPercent(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits))
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`
}

/** A unit price in euros: cents below 1 000 €, more digits for small prices. */
export function formatUnitPrice(value: number): string {
  const digits = value >= 1000 ? 0 : value >= 1 ? 2 : 4
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} €`
}

/** « 3 », « 0,125 » */
export function formatQuantity(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 8 })
}
