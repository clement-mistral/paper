import { inject } from '@adonisjs/core'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import ShoppingService from '#domains/lists/services/shopping_service'

/**
 * `menu:meal_planned` → the recipe ingredients (staples excluded) go to
 * the shopping list. Idempotent through the source unique index.
 */
@inject()
export default class AddMealToShoppingList {
  constructor(
    private meals: MealPlanService,
    private shopping: ShoppingService
  ) {}

  async handle({ mealPlanId }: { mealPlanId: number }) {
    const result = await this.meals.shoppingNeeds(mealPlanId)
    if (!result) return

    await this.shopping.addFromSource(
      result.needs.map((need) => ({
        label: need.label,
        ingredientId: need.ingredientId,
        quantity: need.quantity,
        unit: need.unit,
      })),
      { type: 'meal_plan', id: mealPlanId, domain: 'menu', reason: result.reason }
    )
  }
}
