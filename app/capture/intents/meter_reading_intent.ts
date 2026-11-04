import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cutSpans, extractPastDate } from '#capture/extractors'
import {
  dateField,
  hasOverride,
  isoDate,
  numberField,
  pick,
  read,
  selectField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import MeterService from '#domains/maison/services/meter_service'
import { fromIsoDate, now, today } from '#support/dates'
import { formatDate, formatNumber } from '#support/format'
import { METER_UNITS, type MeterKind } from '#shared/types/maison'
import type { CaptureOverrides } from '#shared/types/capture'

const KEYWORDS = ['releve', 'compteur', 'index', 'linky', 'gazpar']

const KIND_WORDS: Array<[RegExp, MeterKind]> = [
  [/\b(?:elec|electricite|electrique|linky|kwh)\b/, 'electricity'],
  [/\beau\b/, 'water'],
  [/\b(?:gaz|gazpar)\b/, 'gas'],
]

/** An index: digits, possibly grouped by spaces, with decimals. */
const INDEX = /(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,](\d+))?/

export type ParsedReading = {
  value: number | null
  kind: MeterKind | null
  readOn: DateTime | null
  rest: string
}

export function parseReading(raw: string, reference: DateTime = now()): ParsedReading {
  /**
   * The index first, as the longest number of the phrase (« relevé eau
   * 1234 le 3 novembre » → 1234), so the date parser cannot swallow it.
   */
  const matches = [...raw.matchAll(new RegExp(INDEX.source, 'g'))]
  const digits = (match: RegExpMatchArray) => match[0].replace(/\D/g, '').length
  const match = matches.sort((a, b) => digits(b) - digits(a))[0]
  const value = match
    ? Number(`${match[1].replace(/[ \u00a0\u202f]/g, '')}${match[2] ? `.${match[2]}` : ''}`)
    : null
  const withoutIndex = match
    ? raw.slice(0, match.index) + ' ' + raw.slice(match.index! + match[0].length)
    : raw
  const date = extractPastDate(withoutIndex, reference)
  const rest = date ? cutSpans(withoutIndex, [date]) : withoutIndex
  const normalized = normalize(rest)
  return {
    value,
    kind: KIND_WORDS.find(([pattern]) => pattern.test(normalized))?.[1] ?? null,
    readOn: date?.date ?? null,
    rest,
  }
}

/**
 * « relevé eau 1234 », « compteur élec 45 230,5 », « linky 12345 hier »
 * → a meter reading on the home.
 */
@inject()
export default class MeterReadingIntent implements CaptureIntent {
  info = { name: 'meter_reading', label: 'Relevé de compteur', domain: 'maison' } as const
  keywords = KEYWORDS

  constructor(private meters: MeterService) {}

  /**
   * A meter word and a number, never an amount in euros.
   */
  score(input: NormalizedInput): number {
    if (/€|\beuros?\b/i.test(input.raw)) return 0
    const keyword = matchedKeywords(input, this.keywords).length > 0
    const kind = KIND_WORDS.some(([pattern]) => pattern.test(input.text))
    const number = INDEX.test(input.raw)
    if (!number) return keyword ? 0.4 : 0
    if (keyword) return 0.85
    return kind ? 0.45 : 0
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    const meter = draft.meter!
    const unit = METER_UNITS[meter.kind]
    const detail = await this.meters.detail(meter.id)
    const last = detail.lastReading
    const effects: IntentDraft['effects'] = [
      {
        domain: 'maison',
        title: `Relevé ${meter.label} : ${formatNumber(draft.data.value!)} ${unit}`,
        detail: formatDate(fromIsoDate(draft.data.readOn)),
      },
    ]
    if (last && last.readOn < draft.data.readOn) {
      const consumption = draft.data.value! - last.value
      effects.push({
        domain: 'maison',
        title: `${formatNumber(Math.round(consumption * 10) / 10)} ${unit} depuis le ${formatDate(fromIsoDate(last.readOn))}`,
        tone: consumption < 0 ? 'warning' : 'default',
      })
    }
    return { status: 'ready', intent: this.info, fields: draft.fields, missing: [], effects }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0 || !draft.meter) {
      throw new Exception(`Saisie incomplète : ${draft.missing.join(', ')}`, { status: 422 })
    }
    const reading = await this.meters.addReading(
      draft.meter!.id,
      { readOn: draft.data.readOn, value: draft.data.value! },
      trx
    )
    return {
      message: `Relevé ${draft.meter!.label} enregistré`,
      created: [{ type: 'meter_reading' as const, id: reading.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseReading(input.raw)
    const meters = await this.meters.all()
    const rest = ` ${normalize(parsed.rest)} `
    const named =
      meters.find((meter) => rest.includes(` ${normalize(meter.label)} `)) ??
      (parsed.kind ? meters.filter((meter) => meter.kind === parsed.kind) : []).at(0) ??
      null
    const matchedId = named?.id ?? (meters.length === 1 ? meters[0].id : null)
    const meterOverridden = hasOverride(overrides, 'meterId')
    const meterId = meterOverridden ? read.id(overrides.meterId ?? null) : matchedId
    const meter = meters.find(({ id }) => id === meterId) ?? null

    const value = pick(overrides, 'value', parsed.value, read.number)
    const readOn = pick(
      overrides,
      'readOn',
      isoDate(parsed.readOn ?? today()),
      (raw) => read.isoDate(raw) ?? isoDate(today())
    )

    const missing: string[] = []
    if (!meter) missing.push('Compteur')
    if (value.value === null) missing.push('Index')

    return {
      meter,
      data: { value: value.value, readOn: readOn.value },
      missing,
      fields: [
        selectField(
          'meterId',
          'Compteur',
          meterId,
          [{ value: null, label: '—' }, ...meters.map(({ id, label }) => ({ value: id, label }))],
          meterOverridden ? 'override' : named ? 'matched' : meterId ? 'default' : 'empty',
          true
        ),
        numberField('value', 'Index', value.value, value.overridden, {
          parsed: parsed.value !== null,
          suffix: meter ? METER_UNITS[meter.kind] : undefined,
        }),
        dateField('readOn', 'Date', readOn.value, readOn.overridden, !!parsed.readOn),
      ],
    }
  }
}
