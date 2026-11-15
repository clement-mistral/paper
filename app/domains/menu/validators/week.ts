import vine from '@vinejs/vine'
import { MEAL_SLOTS } from '#shared/types/menu'

const plannedMeal = vine.object({
  recipeId: vine.number().withoutDecimals().exists({ table: 'recipes', column: 'id' }),
  plannedOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: vine.enum(MEAL_SLOTS),
  servings: vine.number().withoutDecimals().min(1).max(50),
})

export const weekMealValidator = vine.create(plannedMeal)

export const weekMealsValidator = vine.create({
  meals: vine.array(plannedMeal).minLength(1).maxLength(14),
})

export const weekQueryValidator = vine.create({
  semaine: vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
