import { FuelLogSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#domains/auto/models/vehicle'

export default class FuelLog extends FuelLogSchema {
  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
