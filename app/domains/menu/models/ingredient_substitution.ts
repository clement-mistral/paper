import { IngredientSubstitutionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Ingredient from '#domains/menu/models/ingredient'

export default class IngredientSubstitution extends IngredientSubstitutionSchema {
  @belongsTo(() => Ingredient)
  declare ingredient: BelongsTo<typeof Ingredient>

  @belongsTo(() => Ingredient, { foreignKey: 'substituteId' })
  declare substitute: BelongsTo<typeof Ingredient>
}
