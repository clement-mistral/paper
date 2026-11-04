import { EquipmentMaintenanceSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Equipment from '#domains/maison/models/equipment'

export default class EquipmentMaintenance extends EquipmentMaintenanceSchema {
  @belongsTo(() => Equipment)
  declare equipment: BelongsTo<typeof Equipment>
}
