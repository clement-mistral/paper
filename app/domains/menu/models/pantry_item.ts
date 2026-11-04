import { PantryItemSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Ingredient from '#domains/menu/models/ingredient'
import type { PantryLocation, Unit } from '#shared/types/menu'

export default class PantryItem extends PantryItemSchema {
  @column()
  declare location: PantryLocation

  @column()
  declare unit: Unit | null

  @belongsTo(() => Ingredient)
  declare ingredient: BelongsTo<typeof Ingredient>
}
