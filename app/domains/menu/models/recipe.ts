import { RecipeSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import RecipeIngredient from '#domains/menu/models/recipe_ingredient'
import MealPlan from '#domains/menu/models/meal_plan'

export default class Recipe extends RecipeSchema {
  @hasMany(() => RecipeIngredient)
  declare ingredients: HasMany<typeof RecipeIngredient>

  @hasMany(() => MealPlan)
  declare meals: HasMany<typeof MealPlan>
}
