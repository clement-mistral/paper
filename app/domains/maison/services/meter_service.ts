import { errors } from '@vinejs/vine'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Home from '#domains/maison/models/home'
import Meter from '#domains/maison/models/meter'
import MeterReading from '#domains/maison/models/meter_reading'
import { fromIsoDate, toIsoDate } from '#support/dates'
import {
  METER_UNITS,
  type MeterDetail,
  type MeterKind,
  type MeterRow,
  type ReadingRow,
} from '#shared/types/maison'

export type MeterInput = {
  kind: MeterKind
  label: string
  number?: string | null
  notes?: string | null
}

const round = (value: number, digits = 3) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * Readings with their consumption since the previous one, most recent
 * first.
 */
export function readingRows(readings: MeterReading[]): ReadingRow[] {
  const chronological = [...readings].sort((a, b) => +a.readOn - +b.readOn)
  const rows = chronological.map((reading, index): ReadingRow => {
    const previous = chronological[index - 1]
    if (!previous) {
      return {
        id: reading.id,
        readOn: toIsoDate(reading.readOn),
        value: reading.value,
        consumption: null,
        days: null,
        perDay: null,
      }
    }
    const consumption = round(reading.value - previous.value)
    const days = Math.round(reading.readOn.diff(previous.readOn, 'days').days)
    return {
      id: reading.id,
      readOn: toIsoDate(reading.readOn),
      value: reading.value,
      consumption,
      days,
      perDay: days > 0 ? round(consumption / days, 2) : null,
    }
  })
  return rows.reverse()
}

/**
 * Index of a meter at the start of `day`, interpolated linearly between
 * the surrounding readings; null outside the readings.
 */
export function indexAt(
  readings: Array<{ readOn: string; value: number }>,
  day: string
): { value: number; exact: boolean } | null {
  const sorted = [...readings].sort((a, b) => a.readOn.localeCompare(b.readOn))
  const exact = sorted.find((reading) => reading.readOn === day)
  if (exact) return { value: exact.value, exact: true }
  const after = sorted.findIndex((reading) => reading.readOn > day)
  if (after <= 0) return null
  const before = sorted[after - 1]
  const next = sorted[after]
  const span = Date.parse(next.readOn) - Date.parse(before.readOn)
  const ratio = (Date.parse(day) - Date.parse(before.readOn)) / span
  return { value: before.value + (next.value - before.value) * ratio, exact: false }
}

/**
 * Consumption between two days (`from` included, `to` excluded), from
 * interpolated indexes; null when the readings do not cover the period.
 */
export function consumptionBetween(
  readings: Array<{ readOn: string; value: number }>,
  from: string,
  to: string
): { value: number; estimated: boolean } | null {
  const start = indexAt(readings, from)
  const end = indexAt(readings, to)
  if (!start || !end) return null
  return {
    value: round(end.value - start.value, 1),
    estimated: !start.exact || !end.exact,
  }
}

/**
 * Public service of the Maison domain for utility meters (electricity,
 * water, gas) and their readings.
 */
export default class MeterService {
  async forHome(homeId: number): Promise<MeterRow[]> {
    const meters = await Meter.query().where('home_id', homeId).preload('readings').orderBy('kind')
    return meters.map((meter) => this.toRow(meter, readingRows(meter.readings)))
  }

  async detail(id: number): Promise<MeterDetail> {
    const meter = await Meter.query()
      .where('id', id)
      .preload('home')
      .preload('readings')
      .firstOrFail()
    const readings = readingRows(meter.readings)
    return {
      ...this.toRow(meter, readings),
      homeName: meter.home.name,
      notes: meter.notes,
      readings,
    }
  }

  async create(homeId: number, input: MeterInput): Promise<Meter> {
    const home = await Home.findOrFail(homeId)
    const meter = new Meter()
    meter.homeId = home.id
    this.fill(meter, input)
    await meter.save()
    return meter
  }

  async update(id: number, input: MeterInput): Promise<Meter> {
    const meter = await Meter.findOrFail(id)
    this.fill(meter, input)
    await meter.save()
    return meter
  }

  async delete(id: number): Promise<Meter> {
    const meter = await Meter.findOrFail(id)
    await meter.delete()
    return meter
  }

  /**
   * Records an index; a second reading the same day replaces the first.
   * An index lower than the previous one or higher than the next one is
   * refused: meters only go up.
   */
  async addReading(
    meterId: number,
    input: { readOn: string; value: number },
    client?: TransactionClientContract
  ): Promise<MeterReading> {
    const meter = await Meter.findOrFail(meterId, { client })
    const readOn = fromIsoDate(input.readOn)
    const before = await MeterReading.query({ client })
      .where('meter_id', meter.id)
      .where('read_on', '<', toIsoDate(readOn))
      .orderBy('read_on', 'desc')
      .first()
    const after = await MeterReading.query({ client })
      .where('meter_id', meter.id)
      .where('read_on', '>', toIsoDate(readOn))
      .orderBy('read_on', 'asc')
      .first()
    if ((before && input.value < before.value) || (after && input.value > after.value)) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'value',
          message: 'Un index ne peut pas baisser d’un relevé à l’autre',
          rule: 'meter_monotonic',
        },
      ])
    }
    return MeterReading.updateOrCreate(
      { meterId: meter.id, readOn },
      { meterId: meter.id, readOn, value: input.value },
      { client }
    )
  }

  async deleteReading(id: number, client?: TransactionClientContract): Promise<MeterReading> {
    const reading = await MeterReading.findOrFail(id, { client })
    await reading.delete()
    return reading
  }

  /**
   * Meters for the capture (« relevé eau 1234 »).
   */
  async all(): Promise<Meter[]> {
    return Meter.query().orderBy('kind').orderBy('label')
  }

  private fill(meter: Meter, input: MeterInput) {
    meter.merge({
      kind: input.kind,
      label: input.label,
      number: input.number || null,
      notes: input.notes || null,
    })
  }

  private toRow(meter: Meter, readings: ReadingRow[]): MeterRow {
    return {
      id: meter.id,
      homeId: meter.homeId,
      kind: meter.kind,
      label: meter.label,
      number: meter.number,
      unit: METER_UNITS[meter.kind],
      lastReading: readings[0] ?? null,
    }
  }
}
