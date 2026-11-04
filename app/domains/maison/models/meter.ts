import { MeterSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Home from '#domains/maison/models/home'
import MeterReading from '#domains/maison/models/meter_reading'
import type { MeterKind } from '#shared/types/maison'

export default class Meter extends MeterSchema {
  @column()
  declare kind: MeterKind

  @belongsTo(() => Home)
  declare home: BelongsTo<typeof Home>

  @hasMany(() => MeterReading)
  declare readings: HasMany<typeof MeterReading>
}
