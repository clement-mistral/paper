import { RecipeIngredientSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Ingredient from '#domains/menu/models/ingredient'
import type { Unit } from '#shared/types/menu'

export default class RecipeIngredient extends RecipeIngredientSchema {
  @column()
  declare unit: Unit | null

  @belongsTo(() => Ingredient)
  declare ingredient: BelongsTo<typeof Ingredient>
}
