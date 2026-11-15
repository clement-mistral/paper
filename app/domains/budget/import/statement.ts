import { createHash } from 'node:crypto'
import { normalize } from '#capture/normalizer'

/**
 * A line of a bank statement, whatever its format.
 */
export type StatementLine = {
  /** `YYYY-MM-DD`. */
  occurredOn: string
  label: string
  /** Negative for money out. */
  amountCents: number
  /** Stable id of the line at the bank (OFX FITID, or a hash for CSV). */
  bankRef: string
}

export type ParsedStatement = { format: 'csv' | 'ofx'; lines: StatementLine[] }

export class StatementError extends Error {}

/** The most lines one statement may hold. */
export const MAX_LINES = 5000

/**
 * Text of an uploaded file: UTF-8 when it is valid, else Windows-1252
 * (what most French banks still export). The BOM is dropped.
 */
export function decode(bytes: Uint8Array): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes)
  }
  return text.replace(/^\uFEFF/, '')
}

/**
 * « 1 234,56 », « -12.30 », « 12,30 € », « (12,30) », « +5 » → cents.
 * Null when it is not an amount.
 */
export function parseAmount(raw: string): number | null {
  let value = raw.trim().replace(/[\s\u00A0\u202F€]|EUR/gi, '')
  if (value === '') return null
  let negative = false
  if (/^\(.*\)$/.test(value)) {
    negative = true
    value = value.slice(1, -1)
  }
  if (value.endsWith('-')) {
    negative = true
    value = value.slice(0, -1)
  }
  if (value.startsWith('-')) {
    negative = !negative
    value = value.slice(1)
  } else if (value.startsWith('+')) {
    value = value.slice(1)
  }
  // The last separator is the decimal one when followed by 1 or 2 digits.
  const decimal = value.match(/[.,](\d{1,2})$/)
  const whole = (decimal ? value.slice(0, -decimal[0].length) : value).replace(/[.,']/g, '')
  if (!/^\d+$/.test(whole)) return null
  const cents = Number(whole) * 100 + (decimal ? Number(decimal[1].padEnd(2, '0')) : 0)
  return negative ? -cents : cents
}

/**
 * « 12/11/2026 », « 12/11/26 », « 2026-11-12 », « 12-11-2026 »,
 * « 12.11.2026 » → `2026-11-12`. Null when it is not a valid date.
 */
export function parseDate(raw: string): string | null {
  const value = raw.trim()
  let day: number
  let month: number
  let year: number
  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    ;[year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else {
    match = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
    if (!match) return null
    ;[day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (year < 100) year += 2000
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) return null
  if (date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

/** Runs of spaces in bank labels (fixed-width exports). */
export function cleanLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

const NOISE = new Set([
  'cb',
  'carte',
  'paiement',
  'achat',
  'prlv',
  'prelevement',
  'prelev',
  'sepa',
  'vir',
  'virement',
  'inst',
  'instantane',
  'recu',
  'emis',
  'retrait',
  'dab',
  'fact',
  'facture',
  'du',
  'le',
  'de',
  'des',
  'la',
  'chez',
  'par',
  'pour',
  'ref',
  'mandat',
  'ech',
  'echeance',
])

/**
 * What identifies the merchant in a bank label, for proposing an
 * envelope and learning from the choice: « CB CARREFOUR MARKET 12/11
 * CARTE 4972 » → « carrefour market ». Dates, numbers, card and transfer
 * words are dropped; three words at most.
 */
export function merchantKey(label: string): string {
  return normalize(label)
    .split(' ')
    .filter((word) => word.length > 1 && !NOISE.has(word) && !/\d/.test(word))
    .slice(0, 3)
    .join(' ')
}

/**
 * A readable label for the transaction: the merchant words as the bank
 * wrote them, accents kept, in sentence case (« CB CAFÉ DU COIN 12/11 » →
 * « Café coin »), or the bank's label when nothing is left.
 */
export function displayLabel(label: string): string {
  const words = cleanLabel(label)
    .split(' ')
    .filter((word) =>
      normalize(word)
        .split(' ')
        .some((part) => part.length > 1 && !NOISE.has(part) && !/\d/.test(part))
    )
    .slice(0, 3)
  if (words.length === 0) return cleanLabel(label)
  const text = words.join(' ').toLocaleLowerCase('fr')
  return text.charAt(0).toLocaleUpperCase('fr') + text.slice(1)
}

/**
 * A stable reference for a line without bank id: the same date, amount
 * and label, numbered when they repeat in the file (two coffees the same
 * day).
 */
export function lineRefs(lines: Array<Omit<StatementLine, 'bankRef'>>): StatementLine[] {
  const seen = new Map<string, number>()
  return lines.map((line) => {
    const base = `${line.occurredOn}|${line.amountCents}|${normalize(line.label)}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    const hash = createHash('sha1').update(`${base}|${count}`).digest('hex')
    return { ...line, bankRef: `csv:${hash}` }
  })
}
