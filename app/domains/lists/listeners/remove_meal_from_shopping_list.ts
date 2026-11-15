import { inject } from '@adonisjs/core'
import ShoppingService from '#domains/lists/services/shopping_service'

/**
 * `menu:meal_cancelled` → the meal's ingredients not bought yet leave the
 * shopping list. Idempotent: nothing left to remove the second time.
 */
@inject()
export default class RemoveMealFromShoppingList {
  constructor(private shopping: ShoppingService) {}

  async handle({ mealPlanId }: { mealPlanId: number }) {
    await this.shopping.removeOpenForSource('meal_plan', mealPlanId)
  }
}
