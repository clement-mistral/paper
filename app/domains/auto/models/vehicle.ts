import { VehicleSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import FuelLog from '#domains/auto/models/fuel_log'
import Maintenance from '#domains/auto/models/maintenance'
import type { Fuel } from '#shared/types/auto'

export default class Vehicle extends VehicleSchema {
  @column()
  declare fuel: Fuel

  @hasMany(() => FuelLog)
  declare fuelLogs: HasMany<typeof FuelLog>

  @hasMany(() => Maintenance)
  declare maintenances: HasMany<typeof Maintenance>
}
