import { EquipmentSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Home from '#domains/maison/models/home'
import EquipmentMaintenance from '#domains/maison/models/equipment_maintenance'
import type { EquipmentCategory } from '#shared/types/maison'

export default class Equipment extends EquipmentSchema {
  static table = 'equipment'

  @column()
  declare category: EquipmentCategory

  @belongsTo(() => Home)
  declare home: BelongsTo<typeof Home>

  @hasMany(() => EquipmentMaintenance)
  declare maintenances: HasMany<typeof EquipmentMaintenance>
}
