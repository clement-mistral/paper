import { HomeSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Equipment from '#domains/maison/models/equipment'
import ElectricalCircuit from '#domains/maison/models/electrical_circuit'
import Meter from '#domains/maison/models/meter'
import type { HomeKind, Occupancy } from '#shared/types/maison'

export default class Home extends HomeSchema {
  @column()
  declare kind: HomeKind

  @column()
  declare occupancy: Occupancy

  @hasMany(() => Equipment)
  declare equipment: HasMany<typeof Equipment>

  @hasMany(() => ElectricalCircuit)
  declare circuits: HasMany<typeof ElectricalCircuit>

  @hasMany(() => Meter)
  declare meters: HasMany<typeof Meter>
}
