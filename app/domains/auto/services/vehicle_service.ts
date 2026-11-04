import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import Vehicle from '#domains/auto/models/vehicle'
import FuelLog from '#domains/auto/models/fuel_log'
import AliasService from '#capture/services/alias_service'
import { normalize, normalizePhrases } from '#capture/normalizer'
import { toIsoDate } from '#support/dates'
import type { Fuel, VehicleDetail, VehicleSummary } from '#shared/types/auto'

export type VehicleInput = {
  name: string
  plate?: string
  fuel: Fuel
  initialOdometerKm?: number
  estimatedValueCents?: number
  keywords?: string
  notes?: string
}

/**
 * Current odometer: the highest reading among the initial one, the
 * fill-ups and the done maintenances.
 */
const ODOMETER_SQL = `greatest(
  vehicles.initial_odometer_km,
  coalesce((select max(f.odometer_km) from fuel_logs f where f.vehicle_id = vehicles.id), 0),
  coalesce((select max(m.odometer_km) from maintenances m where m.vehicle_id = vehicles.id and m.done_on is not null), 0)
)::int as odometer_km`

/**
 * Public service of the Auto domain for vehicles.
 */
@inject()
export default class VehicleService {
  constructor(private aliases: AliasService) {}

  async list(): Promise<VehicleSummary[]> {
    const vehicles = await Vehicle.query()
      .select('vehicles.*')
      .select(db.raw(ODOMETER_SQL))
      .orderBy('name')
    return vehicles.map((vehicle) => this.toSummary(vehicle))
  }

  async detail(id: number): Promise<VehicleDetail> {
    const vehicle = await Vehicle.query()
      .select('vehicles.*')
      .select(db.raw(ODOMETER_SQL))
      .where('id', id)
      .firstOrFail()

    const logs = await FuelLog.query()
      .where('vehicle_id', id)
      .orderBy('filled_on', 'desc')
      .orderBy('id', 'desc')
    const phrases = await this.aliases.manualPhrases('vehicle', id)

    /**
     * Statistics over the logs that carry an odometer reading: the fuel
     * of the first full tank is excluded, it was burnt before.
     */
    const withKm = logs.filter((log) => log.odometerKm !== null).reverse()
    let costPerKmCents: number | null = null
    let litersPer100Km: number | null = null
    if (withKm.length >= 2) {
      const distance = withKm[withKm.length - 1].odometerKm! - withKm[0].odometerKm!
      const after = withKm.slice(1)
      const cost = after.reduce((total, log) => total + log.totalCents, 0)
      const liters = after.reduce((total, log) => total + log.liters, 0)
      if (distance > 0) {
        costPerKmCents = Math.round((cost / distance) * 10) / 10
        litersPer100Km = Math.round((liters / distance) * 1000) / 10
      }
    }

    /**
     * Per fill-up: the liters put in refill what was burnt since the
     * previous reading.
     */
    const perFill = new Map<number, number>()
    withKm.forEach((log, index) => {
      const previous = withKm[index - 1]
      if (!previous) return
      const distance = log.odometerKm! - previous.odometerKm!
      if (distance > 0) perFill.set(log.id, Math.round((log.liters / distance) * 1000) / 10)
    })

    return {
      ...this.toSummary(vehicle),
      initialOdometerKm: vehicle.initialOdometerKm,
      estimatedValueCents: vehicle.estimatedValueCents,
      notes: vehicle.notes,
      keywords: phrases.filter((phrase) => phrase !== normalize(vehicle.name)),
      fuelCostCents: logs.reduce((total, log) => total + log.totalCents, 0),
      costPerKmCents,
      litersPer100Km,
      fuelLogs: logs.map((log) => ({
        id: log.id,
        filledOn: toIsoDate(log.filledOn),
        liters: log.liters,
        totalCents: log.totalCents,
        pricePerLiterCents: log.liters > 0 ? Math.round(log.totalCents / log.liters) : 0,
        odometerKm: log.odometerKm,
        litersPer100Km: perFill.get(log.id) ?? null,
      })),
    }
  }

  async all(): Promise<Vehicle[]> {
    return Vehicle.query().orderBy('name')
  }

  /**
   * Vehicle named in a normalized text (« la clio », « la voiture »).
   */
  async match(text: string): Promise<Vehicle | null> {
    const alias = await this.aliases.findInText('vehicle', text)
    return alias ? Vehicle.find(alias.entityId) : null
  }

  async odometer(id: number): Promise<number> {
    const vehicle = await Vehicle.query()
      .select('vehicles.*')
      .select(db.raw(ODOMETER_SQL))
      .where('id', id)
      .firstOrFail()
    return Number(vehicle.$extras.odometer_km)
  }

  async create(input: VehicleInput): Promise<Vehicle> {
    return db.transaction(async (trx) => {
      const vehicle = new Vehicle().useTransaction(trx)
      this.fill(vehicle, input)
      await vehicle.save()
      await this.aliases.syncManual(
        'vehicle',
        vehicle.id,
        normalizePhrases([vehicle.name, input.keywords ?? ''].join(',')),
        trx
      )
      return vehicle
    })
  }

  async update(id: number, input: VehicleInput): Promise<Vehicle> {
    return db.transaction(async (trx) => {
      const vehicle = await Vehicle.findOrFail(id, { client: trx })
      this.fill(vehicle, input)
      await vehicle.save()
      await this.aliases.syncManual(
        'vehicle',
        vehicle.id,
        normalizePhrases([vehicle.name, input.keywords ?? ''].join(',')),
        trx
      )
      return vehicle
    })
  }

  async delete(id: number) {
    await db.transaction(async (trx) => {
      const vehicle = await Vehicle.findOrFail(id, { client: trx })
      await this.aliases.removeFor('vehicle', id, trx)
      await vehicle.delete()
    })
  }

  private fill(vehicle: Vehicle, input: VehicleInput) {
    vehicle.merge({
      name: input.name,
      plate: input.plate ?? null,
      fuel: input.fuel,
      initialOdometerKm: input.initialOdometerKm ?? 0,
      estimatedValueCents: input.estimatedValueCents ?? null,
      notes: input.notes ?? null,
    })
  }

  private toSummary(vehicle: Vehicle): VehicleSummary {
    return {
      id: vehicle.id,
      name: vehicle.name,
      plate: vehicle.plate,
      fuel: vehicle.fuel,
      odometerKm: Number(vehicle.$extras.odometer_km ?? vehicle.initialOdometerKm),
    }
  }
}
