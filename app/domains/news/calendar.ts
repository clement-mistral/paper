import { DateTime } from 'luxon'
import { HOME_ZONE } from '#support/dates'
import type { MoonInfo, PublicHoliday } from '#shared/types/news'

/* ------------------------------------------------------------------ */
/* Moon                                                                */
/* ------------------------------------------------------------------ */

type PrincipalPhase = 'new' | 'first' | 'full' | 'last'

const PHASE_LABELS: Record<PrincipalPhase, string> = {
  new: 'Nouvelle lune',
  first: 'Premier quartier',
  full: 'Pleine lune',
  last: 'Dernier quartier',
}

/** Between two principal phases, the one after each. */
const BETWEEN: Record<PrincipalPhase, string> = {
  new: 'Premier croissant',
  first: 'Lune gibbeuse croissante',
  full: 'Lune gibbeuse décroissante',
  last: 'Dernier croissant',
}

const PHASES: PrincipalPhase[] = ['new', 'first', 'full', 'last']
const rad = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Instant of a principal phase of the Moon, after Jean Meeus,
 * « Astronomical Algorithms », ch. 49 (main periodic terms: a few
 * minutes off at most). `k` is the lunation since January 2000, plus
 * 0, 0.25, 0.5 or 0.75 for the phase.
 */
export function phaseInstant(k: number): DateTime {
  const T = k / 1236.85
  const jde =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T ** 2 -
    0.00000015 * T ** 3 +
    0.00000000073 * T ** 4
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2
  const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3)
  const Mp = rad(
    201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4
  )
  const F = rad(
    160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4
  )
  const O = rad(124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3)
  const fraction = Math.round((k - Math.floor(k)) * 4) % 4
  const sin = Math.sin
  const cos = Math.cos

  let correction: number
  if (fraction === 0 || fraction === 2) {
    const full = fraction === 2
    correction =
      (full ? -0.40614 : -0.4072) * sin(Mp) +
      (full ? 0.17302 : 0.17241) * E * sin(M) +
      (full ? 0.01614 : 0.01608) * sin(2 * Mp) +
      (full ? 0.01043 : 0.01039) * sin(2 * F) +
      (full ? 0.00734 : 0.00739) * E * sin(Mp - M) -
      (full ? 0.00515 : 0.00514) * E * sin(Mp + M) +
      (full ? 0.00209 : 0.00208) * E * E * sin(2 * M) -
      0.00111 * sin(Mp - 2 * F) -
      0.00057 * sin(Mp + 2 * F) +
      0.00056 * E * sin(2 * Mp + M) -
      0.00042 * sin(3 * Mp) +
      0.00042 * E * sin(M + 2 * F) +
      0.00038 * E * sin(M - 2 * F) -
      0.00024 * E * sin(2 * Mp - M) -
      0.00017 * sin(O)
  } else {
    correction =
      -0.62801 * sin(Mp) +
      0.17172 * E * sin(M) -
      0.01183 * E * sin(Mp + M) +
      0.00862 * sin(2 * Mp) +
      0.00804 * sin(2 * F) +
      0.00454 * E * sin(Mp - M) +
      0.00204 * E * E * sin(2 * M) -
      0.0018 * sin(Mp - 2 * F) -
      0.0007 * sin(Mp + 2 * F) -
      0.0004 * sin(3 * Mp) -
      0.00034 * E * sin(2 * Mp - M) +
      0.00032 * E * sin(M + 2 * F) +
      0.00032 * E * sin(M - 2 * F) -
      0.00028 * E * E * sin(Mp + 2 * M) +
      0.00027 * E * sin(2 * Mp + M) -
      0.00017 * sin(O)
    const W =
      0.00306 -
      0.00038 * E * cos(M) +
      0.00026 * cos(Mp) -
      0.00002 * cos(Mp - M) +
      0.00002 * cos(Mp + M) +
      0.00002 * cos(2 * F)
    correction += fraction === 1 ? W : -W
  }
  const julian = jde + correction
  return DateTime.fromMillis((julian - 2440587.5) * 86_400_000, { zone: HOME_ZONE })
}

/** The principal phases from a lunation before `day` to two after. */
function phasesAround(day: DateTime): Array<{ phase: PrincipalPhase; at: DateTime }> {
  const years = day.year + (day.ordinal - 1) / (day.isInLeapYear ? 366 : 365) - 2000
  const start = Math.floor(years * 12.3685) - 1
  const phases: Array<{ phase: PrincipalPhase; at: DateTime }> = []
  for (let lunation = start; lunation <= start + 3; lunation++) {
    PHASES.forEach((phase, index) => {
      phases.push({ phase, at: phaseInstant(lunation + index / 4) })
    })
  }
  return phases
}

/**
 * The Moon that day (household zone): the principal phase when it falls
 * that day, with its time, or the phase between two; and the next full
 * and new moons.
 */
export function moonOf(day: DateTime): MoonInfo {
  const start = day.setZone(HOME_ZONE).startOf('day')
  const end = start.plus({ days: 1 })
  const phases = phasesAround(start)
  const todays = phases.find(({ at }) => at >= start && at < end)
  const previous = [...phases].reverse().find(({ at }) => at < start)
  const nextOf = (phase: PrincipalPhase) =>
    phases.find((candidate) => candidate.phase === phase && candidate.at >= end)!.at.toISODate()!
  return {
    label: todays ? PHASE_LABELS[todays.phase] : previous ? BETWEEN[previous.phase] : 'Lune',
    time: todays ? todays.at.toFormat("HH'h'mm") : null,
    principal: todays?.phase ?? null,
    nextFull: nextOf('full'),
    nextNew: nextOf('new'),
  }
}

/* ------------------------------------------------------------------ */
/* Public holidays (France métropolitaine)                             */
/* ------------------------------------------------------------------ */

/** Easter Sunday (Gregorian computus, « anonymous » algorithm). */
export function easterOf(year: number): DateTime {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const date = ((h + l - 7 * m + 114) % 31) + 1
  return DateTime.fromObject({ year, month, day: date }, { zone: HOME_ZONE })
}

/** The eleven public holidays of a year, in date order. */
export function holidaysOf(year: number): Array<{ name: string; day: string }> {
  const easter = easterOf(year)
  const fixed = (month: number, date: number) =>
    DateTime.fromObject({ year, month, day: date }, { zone: HOME_ZONE })
  return [
    { name: 'Jour de l’An', at: fixed(1, 1) },
    { name: 'Lundi de Pâques', at: easter.plus({ days: 1 }) },
    { name: 'Fête du Travail', at: fixed(5, 1) },
    { name: 'Victoire 1945', at: fixed(5, 8) },
    { name: 'Ascension', at: easter.plus({ days: 39 }) },
    { name: 'Lundi de Pentecôte', at: easter.plus({ days: 50 }) },
    { name: 'Fête nationale', at: fixed(7, 14) },
    { name: 'Assomption', at: fixed(8, 15) },
    { name: 'Toussaint', at: fixed(11, 1) },
    { name: 'Armistice 1918', at: fixed(11, 11) },
    { name: 'Noël', at: fixed(12, 25) },
  ]
    .sort((left, right) => left.at.toMillis() - right.at.toMillis())
    .map(({ name, at }) => ({ name, day: at.toISODate()! }))
}

/**
 * Whether that day is a public holiday, and the next one after it. A
 * holiday on a Tuesday or a Thursday is flagged as a « pont ».
 */
export function holidayOf(day: DateTime): { today: string | null; next: PublicHoliday } {
  const iso = day.toISODate()!
  const all = [...holidaysOf(day.year), ...holidaysOf(day.year + 1)]
  const today = all.find((holiday) => holiday.day === iso)?.name ?? null
  const next = all.find((holiday) => holiday.day > iso)!
  const at = DateTime.fromISO(next.day, { zone: HOME_ZONE })
  return {
    today,
    next: {
      name: next.name,
      day: next.day,
      inDays: Math.round(at.diff(day.startOf('day'), 'days').days),
      bridge: at.weekday === 2 || at.weekday === 4,
    },
  }
}
