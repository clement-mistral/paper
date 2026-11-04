import { MealPlanSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Recipe from '#domains/menu/models/recipe'
import type { MealOutcome, MealSlot } from '#shared/types/menu'

export default class MealPlan extends MealPlanSchema {
  @column()
  declare slot: MealSlot

  @column()
  declare outcome: MealOutcome | null

  @belongsTo(() => Recipe)
  declare recipe: BelongsTo<typeof Recipe>
}
