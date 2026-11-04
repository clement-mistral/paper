import vine from '@vinejs/vine'
import { MEAL_SLOTS } from '#shared/types/menu'

export const mealValidator = vine.create({
  recipeId: vine.number().withoutDecimals().exists({ table: 'recipes', column: 'id' }).nullable(),
  /**
   * Name of the recipe to create when `recipeId` is empty.
   */
  newRecipeName: vine.string().trim().maxLength(120).nullable(),
  plannedOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: vine.enum(MEAL_SLOTS),
  servings: vine.number().withoutDecimals().min(1).max(50),
})
