import { MaintenanceSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#domains/auto/models/vehicle'
import type { MaintenanceKind } from '#shared/types/auto'

export default class Maintenance extends MaintenanceSchema {
  @column()
  declare kind: MaintenanceKind

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
