import { DateTime } from 'luxon'

/**
 * Time zone of the household. The process runs in UTC, but « aujourd'hui »
 * and « hier » are always understood in this zone.
 */
export const HOME_ZONE = 'Europe/Paris'

export function now(): DateTime {
  return DateTime.now().setZone(HOME_ZONE)
}

export function today(): DateTime {
  return now().startOf('day')
}

/**
 * Parses an ISO `YYYY-MM-DD` date in the household zone.
 */
export function fromIsoDate(value: string): DateTime {
  return DateTime.fromISO(value, { zone: HOME_ZONE }).startOf('day')
}

export function toIsoDate(value: DateTime): string {
  return value.toISODate() ?? ''
}
