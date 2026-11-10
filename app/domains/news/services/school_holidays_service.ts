import { DateTime } from 'luxon'
import { fetchPublicText } from '#support/safe_fetch'
import { HOME_ZONE } from '#support/dates'
import type { SchoolHolidays, SchoolZone } from '#shared/types/news'

const API =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records'
const CACHE_MS = 12 * 60 * 60 * 1000

export type HolidayPeriod = { name: string; firstDay: string; lastDay: string }

type RecordsJson = {
  results?: Array<{
    description?: string
    population?: string
    start_date?: string
    end_date?: string
  }>
}

/**
 * The official dataset gives `start_date` as the first day off and
 * `end_date` as the day classes resume, both at midnight Paris time
 * (written in UTC), except a « pont » whose end is its start: one day
 * off. Teachers-only periods are left out; the académies of a zone share
 * the same dates, so duplicates are merged.
 */
export function parsePeriods(json: RecordsJson): HolidayPeriod[] {
  const periods = new Map<string, HolidayPeriod>()
  for (const record of json.results ?? []) {
    if (!record.description || !record.start_date || !record.end_date) continue
    if (record.population && !['-', 'Élèves'].includes(record.population)) continue
    const first = DateTime.fromISO(record.start_date).setZone(HOME_ZONE).startOf('day')
    const resume = DateTime.fromISO(record.end_date).setZone(HOME_ZONE).startOf('day')
    const last = resume > first ? resume.minus({ days: 1 }) : first
    const period = {
      name: record.description.trim().replaceAll("'", '’'),
      firstDay: first.toISODate()!,
      lastDay: last.toISODate()!,
    }
    periods.set(`${period.name}|${period.firstDay}`, period)
  }
  return [...periods.values()].sort((left, right) => left.firstDay.localeCompare(right.firstDay))
}

/** The holidays under way on `day` and the next ones, from the periods. */
export function schoolHolidaysOn(
  zone: SchoolZone,
  day: string,
  periods: HolidayPeriod[]
): SchoolHolidays {
  const current = periods.find((period) => period.firstDay <= day && period.lastDay >= day)
  const next = periods.find((period) => period.firstDay > day)
  const start = DateTime.fromISO(day, { zone: HOME_ZONE })
  return {
    zone,
    current: current ? { name: current.name, lastDay: current.lastDay } : null,
    next: next
      ? {
          name: next.name,
          firstDay: next.firstDay,
          inDays: Math.round(
            DateTime.fromISO(next.firstDay, { zone: HOME_ZONE }).diff(start, 'days').days
          ),
        }
      : null,
  }
}

const cache = new Map<string, { at: number; periods: HolidayPeriod[] | null }>()

/**
 * School holidays of a zone, from the official calendar of the
 * Éducation nationale (open data, no key). Cached half a day; any failure
 * gives null and the sheet leaves them out.
 */
export default class SchoolHolidaysService {
  async on(zone: SchoolZone, day: string): Promise<SchoolHolidays | null> {
    const periods = await this.periods(zone, day)
    return periods ? schoolHolidaysOn(zone, day, periods) : null
  }

  private async periods(zone: SchoolZone, day: string): Promise<HolidayPeriod[] | null> {
    /** From a month back, so that holidays under way are included. */
    const from = DateTime.fromISO(day, { zone: HOME_ZONE }).minus({ months: 1 }).toISODate()!
    const key = `${zone}|${from.slice(0, 7)}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.periods

    let periods: HolidayPeriod[] | null = null
    try {
      const url = new URL(API)
      url.search = new URLSearchParams({
        where: `zones = "${zone === 'Corse' ? 'Corse' : `Zone ${zone}`}" and end_date >= "${from}"`,
        order_by: 'start_date',
        limit: '100',
      }).toString()
      const { text } = await fetchPublicText(url.toString(), {
        accept: 'application/json',
        timeoutMs: 5000,
        maxBytes: 500_000,
      })
      periods = parsePeriods(JSON.parse(text) as RecordsJson)
    } catch {
      periods = null
    }
    cache.set(key, { at: Date.now(), periods })
    return periods
  }
}
