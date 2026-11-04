import * as chrono from 'chrono-node'
import { type DateTime } from 'luxon'
import { normalize } from '#capture/normalizer'
import { now } from '#support/dates'

type Span = { start: number; end: number }

export type AmountMatch = Span & { cents: number; explicit: boolean }

const GROUPED = String.raw`\d{1,3}(?:[ \u00a0\u202f]\d{3})+`

/**
 * « 4€50 » / « 4 € 50 » / « 4e50 »
 */
const EURO_INFIX = /(\d+)(?:\s?€\s?|e)(\d{2})(?!\d)/

/**
 * « 4,50 € », « 1 200 € », « 12 euros », « 8 eur », « 12e »
 */
const EURO_SUFFIX = new RegExp(
  String.raw`(${GROUPED}|\d+)(?:[.,](\d{1,2}))?(?:\s*(?:€|euros?\b|eur\b)|e\b)`,
  'i'
)

/**
 * A bare number (« café 4,50 »), only used when nothing else is found.
 * Numbers glued to a unit (km, L, h, %), part of a date or counting people
 * (« pour 6 », « 4 personnes ») are skipped.
 */
const BARE_NUMBER = new RegExp(
  String.raw`(?<![A-Za-zÀ-ÿ\d/:.,])(?<!\bpour\s)(${GROUPED}|\d+)(?:[.,](\d{1,2}))?(?![\d/:]|[.,]\d|\s*(?:km|l|litres?|h(?:\d{2})?|heures?|%|x|personnes?|pers|parts?|portions?)\b)`,
  'gi'
)

function toCents(integer: string, decimals: string | undefined): number {
  const units = Number.parseInt(integer.replace(/[ \u00a0\u202f]/g, ''), 10)
  const cents = decimals ? Number.parseInt(decimals.padEnd(2, '0'), 10) : 0
  return units * 100 + cents
}

/**
 * Finds an amount in euros. An explicit currency wins over a bare number;
 * a bare number is only accepted when it is the only one in the text.
 */
export function extractAmount(text: string): AmountMatch | null {
  for (const pattern of [EURO_INFIX, EURO_SUFFIX]) {
    const match = pattern.exec(text)
    if (match) {
      return {
        cents: toCents(match[1], match[2]),
        start: match.index,
        end: match.index + match[0].length,
        explicit: true,
      }
    }
  }

  const bare = [...text.matchAll(BARE_NUMBER)]
  if (bare.length !== 1) return null
  const [match] = bare
  return {
    cents: toCents(match[1], match[2]),
    start: match.index,
    end: match.index + match[0].length,
    explicit: false,
  }
}

const AVANT_HIER = /\bavant[- ]hier\b/i
const APRES_DEMAIN = /\bapr[eè]s[- ]demain\b/i

/**
 * « le 15 », « le 1er », not followed by a month, an amount or a unit.
 */
const DAY_OF_MONTH = /\ble\s+(\d{1,2})(?:er)?\b(?![.,/]\d|\s*(?:€|eur|euros?|km|l)\b)/i

/**
 * Upcoming weekday (1 = Monday … 7 = Sunday), today included.
 */
function nextWeekday(today: DateTime, weekday: number): DateTime {
  return today.plus({ days: (weekday - today.weekday + 7) % 7 })
}

const CUSTOM_DATES: Array<[RegExp, (today: DateTime) => DateTime]> = [
  [/\b(?:en\s+)?fin\s+(?:du|de)\s+mois\b/i, (today) => today.endOf('month').startOf('day')],
  [
    /\b(?:en\s+)?d[ée]but\s+(?:du\s+)?mois\s+prochain\b/i,
    (today) => today.plus({ months: 1 }).startOf('month'),
  ],
  [/\b(?:ce|le)\s+week-?end\b/i, (today) => nextWeekday(today, 6)],
  [/\b(?:en\s+)?fin\s+de\s+semaine\b/i, (today) => nextWeekday(today, 5)],
  [/(?<!la\s)\bsemaine\s+prochaine\b/i, (today) => today.plus({ weeks: 1 }).startOf('week')],
]

const THIS_PART_OF_DAY = /\b(?:ce|cet|cette)\s+(?:soir|midi|matin|apr[eè]s[- ]midi|nuit)\b/i

export type DateDirection = 'past' | 'future'

export type DateMatch = Span & {
  date: DateTime
  /** The text gave a day of the month (« le 15 », « 12/10 »). */
  hasDay: boolean
  /** The text gave a month (« 12 mars », « 12/10 »). */
  hasMonth: boolean
}

/**
 * Finds a date written in French (« hier », « jeudi », « le 15 »,
 * « 12/10 »). When the text does not fix it completely, the date is moved
 * in the given direction: for an expense « lundi » is last Monday, for a
 * meal « jeudi » is next Thursday.
 */
export function extractDate(
  text: string,
  direction: DateDirection,
  reference: DateTime = now()
): DateMatch | null {
  const today = reference.startOf('day')

  /**
   * Forms chrono does not understand in French.
   */
  const relative = direction === 'past' ? AVANT_HIER.exec(text) : APRES_DEMAIN.exec(text)
  if (relative) {
    return {
      date: today.plus({ days: direction === 'past' ? -2 : 2 }),
      start: relative.index,
      end: relative.index + relative[0].length,
      hasDay: false,
      hasMonth: false,
    }
  }

  for (const [pattern, resolve] of CUSTOM_DATES) {
    const match = pattern.exec(text)
    if (match) {
      return {
        date: resolve(today),
        start: match.index,
        end: match.index + match[0].length,
        hasDay: false,
        hasMonth: false,
      }
    }
  }

  const [result] = chrono.fr.parse(
    text,
    { instant: reference.toJSDate(), timezone: reference.offset },
    { forwardDate: direction === 'future' }
  )

  if (!result) {
    const dayOfMonth = DAY_OF_MONTH.exec(text)
    if (!dayOfMonth) return null
    const day = Number(dayOfMonth[1])
    let date = today.set({ day })
    if (!date.isValid || date.day !== day) return null
    if (direction === 'past' && date > today) date = date.minus({ months: 1 })
    if (direction === 'future' && date < today) date = date.plus({ months: 1 })
    return {
      date,
      start: dayOfMonth.index,
      end: dayOfMonth.index + dayOfMonth[0].length,
      hasDay: true,
      hasMonth: false,
    }
  }

  /**
   * « ce soir » is today even once the evening has started (chrono moves
   * it to tomorrow after 20:00).
   */
  if (THIS_PART_OF_DAY.test(result.text)) {
    return {
      date: today,
      start: result.index,
      end: result.index + result.text.length,
      hasDay: false,
      hasMonth: false,
    }
  }

  let date = reference
    .set({
      year: result.start.get('year') ?? reference.year,
      month: result.start.get('month') ?? reference.month,
      day: result.start.get('day') ?? reference.day,
    })
    .startOf('day')

  const certainYear = result.start.isCertain('year')
  const certainMonth = result.start.isCertain('month')
  const certainDay = result.start.isCertain('day')
  const shift = direction === 'past' ? -1 : 1
  const wrongSide = direction === 'past' ? date > today : date < today

  if (wrongSide && !certainYear) {
    if (certainMonth) date = date.plus({ years: shift })
    else if (certainDay) date = date.plus({ months: shift })
    else date = date.plus({ weeks: shift })
  }

  return {
    date,
    start: result.index,
    end: result.index + result.text.length,
    hasDay: certainDay,
    hasMonth: certainMonth,
  }
}

export function extractPastDate(text: string, reference: DateTime = now()): DateMatch | null {
  return extractDate(text, 'past', reference)
}

/**
 * « 38 L », « 38,2 litres »
 */
export function extractLiters(text: string): (Span & { liters: number }) | null {
  const match = /(\d+(?:[.,]\d{1,2})?)\s*(?:l|litres?)\b/i.exec(text)
  if (!match) return null
  return {
    liters: Number.parseFloat(match[1].replace(',', '.')),
    start: match.index,
    end: match.index + match[0].length,
  }
}

/**
 * « 142380 km », « 142 380 km »
 */
export function extractKm(text: string): (Span & { km: number }) | null {
  const match = new RegExp(String.raw`(${GROUPED}|\d+)\s*km\b`, 'i').exec(text)
  if (!match) return null
  return {
    km: Number.parseInt(match[1].replace(/[ \u00a0\u202f]/g, ''), 10),
    start: match.index,
    end: match.index + match[0].length,
  }
}

/**
 * « pour 6 », « 4 personnes », « 2 parts »
 */
export function extractServings(text: string): (Span & { servings: number }) | null {
  const match =
    /\bpour\s+(\d{1,2})(?:\s*(?:personnes?|pers\.?|parts?))?\b|\b(\d{1,2})\s*(?:personnes?|pers\.?|parts?|portions?)\b/i.exec(
      text
    )
  if (!match) return null
  return {
    servings: Number(match[1] ?? match[2]),
    start: match.index,
    end: match.index + match[0].length,
  }
}

/**
 * Removes every occurrence of the given words (compared normalized).
 */
export function removeWords(text: string, words: string[]): string {
  const set = new Set(words)
  return text
    .split(/\s+/)
    .filter((word) => !set.has(normalize(word)))
    .join(' ')
}

/**
 * Removes the given spans from the text.
 */
export function cutSpans(text: string, spans: Span[]): string {
  const sorted = [...spans].sort((a, b) => b.start - a.start)
  let output = text
  for (const span of sorted) {
    output = `${output.slice(0, span.start)} ${output.slice(span.end)}`
  }
  return output.replace(/\s+/g, ' ').trim()
}

/**
 * Leading and trailing filler words dropped from a label
 * (« j'ai payé un café au » → « café »).
 */
const FILLERS = new Set([
  'j',
  'ai',
  'paye',
  'payes',
  'payer',
  'achete',
  'achat',
  'depense',
  'depenses',
  'pour',
  'de',
  'd',
  'du',
  'des',
  'le',
  'la',
  'les',
  'l',
  'un',
  'une',
  'au',
  'aux',
  'a',
  'en',
  'et',
])

/**
 * Title of a task: verbs and apostrophes are kept (« Payer la cantine »,
 * « Changer l’ampoule »), only surrounding punctuation and trailing
 * prepositions are dropped.
 */
export function cleanTitle(text: string): string {
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’')]+$/gu, ''))
    .filter((word) => word.length > 0)
  while (
    words.length > 0 &&
    ['de', 'du', 'a', 'pour', 'le', 'la', 'et'].includes(normalize(words[words.length - 1]))
  ) {
    words.pop()
  }
  const title = words.join(' ')
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export function cleanLabel(text: string): string {
  const words = text
    .replace(/[’']/g, "' ")
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((word) => word.length > 0)

  while (words.length > 0 && FILLERS.has(normalize(words[0]))) words.shift()
  while (words.length > 0 && FILLERS.has(normalize(words[words.length - 1]))) words.pop()

  const label = words.join(' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * A time of day: « à 14h », « 14h30 », « 18:00 », « 9 heures ».
 */
export function extractTime(text: string): (Span & { time: string }) | null {
  const match =
    /(?:\b[àa]\s+)?\b([01]?\d|2[0-3])\s*(?:h|heures?|:)\s*([0-5]\d)?(?![\d.,])(?!\s*(?:de\s+route|km))/i.exec(
      text
    )
  if (!match) return null
  return {
    time: `${match[1].padStart(2, '0')}:${match[2] ?? '00'}`,
    start: match.index,
    end: match.index + match[0].length,
  }
}

export type RecurrenceMatch = Span & {
  recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  /** Weekday of a weekly recurrence (1 = Monday … 7 = Sunday). */
  weekday: number | null
}

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/**
 * « tous les jours », « tous les mardis », « toutes les 2 semaines »,
 * « tous les 15 jours », « chaque mois », « tous les ans ».
 */
export function extractRecurrence(text: string): RecurrenceMatch | null {
  const pattern =
    /\b(?:tous\s+les|toutes\s+les|chaque)\s+(?:(\d+)\s+)?(jours?|semaines?|mois|ans?|ann[ée]es?|lundis?|mardis?|mercredis?|jeudis?|vendredis?|samedis?|dimanches?)\b/i
  const match = pattern.exec(text)
  if (!match) return null
  const interval = match[1] ? Number(match[1]) : 1
  const unit = normalize(match[2]).replace(/s$/, '')
  const span = { start: match.index, end: match.index + match[0].length }

  const weekday = WEEKDAYS.indexOf(unit)
  if (weekday >= 0) return { ...span, recurrence: 'weekly', interval, weekday: weekday + 1 }
  if (unit === 'jour') {
    return interval % 7 === 0
      ? { ...span, recurrence: 'weekly', interval: interval / 7, weekday: null }
      : { ...span, recurrence: 'daily', interval, weekday: null }
  }
  if (unit === 'semaine') return { ...span, recurrence: 'weekly', interval, weekday: null }
  if (unit === 'moi') return { ...span, recurrence: 'monthly', interval, weekday: null }
  return { ...span, recurrence: 'yearly', interval, weekday: null }
}
