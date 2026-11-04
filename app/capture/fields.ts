import { type DateTime } from 'luxon'
import { formatAmount, formatDate } from '#support/format'
import { fromIsoDate } from '#support/dates'
import { parseEuros } from '#support/money'
import type { CaptureField, CaptureFieldSource, CaptureOverrides } from '#shared/types/capture'

/**
 * Helpers shared by intents to read the user's corrections and describe
 * fields in a uniform way.
 */

export function hasOverride(overrides: CaptureOverrides, key: string): boolean {
  return Object.hasOwn(overrides, key) && overrides[key] !== undefined
}

/**
 * The corrected value when there is one, the extracted one otherwise.
 */
export function pick<T>(
  overrides: CaptureOverrides,
  key: string,
  parsed: T,
  read: (value: string | number | null) => T
): { value: T; overridden: boolean } {
  if (!hasOverride(overrides, key)) return { value: parsed, overridden: false }
  return { value: read(overrides[key] ?? null), overridden: true }
}

export const read = {
  id(value: string | number | null): number | null {
    if (value === null || value === '') return null
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
  },
  cents(value: string | number | null): number | null {
    if (value === null) return null
    return typeof value === 'number' ? value : parseEuros(value)
  },
  text(value: string | number | null): string {
    return String(value ?? '').trim()
  },
  number(value: string | number | null): number | null {
    if (value === null || value === '') return null
    const number = Number(String(value).replace(',', '.'))
    return Number.isFinite(number) ? number : null
  },
  isoDate(value: string | number | null): string | null {
    const text = String(value ?? '')
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
  },
}

function source(
  overridden: boolean,
  found: boolean,
  fallback: CaptureFieldSource = 'empty'
): CaptureFieldSource {
  if (overridden) return 'override'
  return found ? 'parsed' : fallback
}

export function amountField(
  key: string,
  label: string,
  value: number | null,
  overridden: boolean,
  parsed: boolean
): CaptureField {
  return {
    key,
    label,
    kind: 'amount',
    value,
    display: value === null ? '—' : formatAmount(value),
    source: source(overridden, parsed),
    required: true,
  }
}

export function textField(
  key: string,
  label: string,
  value: string,
  overridden: boolean,
  options: { required?: boolean; source?: CaptureFieldSource } = {}
): CaptureField {
  return {
    key,
    label,
    kind: 'text',
    value,
    display: value || '—',
    source: overridden ? 'override' : (options.source ?? (value ? 'parsed' : 'empty')),
    required: options.required ?? true,
  }
}

export function dateField(
  key: string,
  label: string,
  value: string,
  overridden: boolean,
  parsed: boolean
): CaptureField {
  return {
    key,
    label,
    kind: 'date',
    value,
    display: formatDate(fromIsoDate(value)),
    source: source(overridden, parsed, 'default'),
    required: true,
  }
}

export function numberField(
  key: string,
  label: string,
  value: number | null,
  overridden: boolean,
  options: {
    parsed: boolean
    suffix?: string
    required?: boolean
    fallback?: CaptureFieldSource
  }
): CaptureField {
  return {
    key,
    label,
    kind: 'number',
    value,
    display: value === null ? '—' : String(value).replace('.', ','),
    source: source(overridden, options.parsed, options.fallback),
    required: options.required ?? true,
    suffix: options.suffix,
  }
}

export function selectField(
  key: string,
  label: string,
  value: number | string | null,
  options: Array<{ value: number | string | null; label: string }>,
  fieldSource: CaptureFieldSource,
  required = false
): CaptureField {
  return {
    key,
    label,
    kind: 'select',
    value,
    display: options.find((option) => option.value === value)?.label ?? '—',
    source: fieldSource,
    required,
    options,
  }
}

export function isoDate(value: DateTime): string {
  return value.toISODate() ?? ''
}
