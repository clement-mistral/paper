import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import MealPlan from '#domains/menu/models/meal_plan'
import PantryService from '#domains/menu/services/pantry_service'
import RecipeService, { type ShoppingNeed } from '#domains/menu/services/recipe_service'
import { fromIsoDate, toIsoDate } from '#support/dates'
import type { MealOutcome, MealPlanRow, MealSlot } from '#shared/types/menu'

export type MealPlanInput = {
  recipeId: number
  plannedOn: string
  slot: MealSlot
  servings: number
}

/**
 * Public service of the Menu domain for planned meals.
 */
@inject()
export default class MealPlanService {
  constructor(
    private recipes: RecipeService,
    private pantry: PantryService
  ) {}

  /**
   * Plans a meal. `menu:meal_planned` is emitted once the transaction is
   * committed, so listeners (shopping list) only see persisted meals.
   */
  async plan(
    input: MealPlanInput,
    trx: TransactionClientContract,
    meta: { captureText?: string } = {}
  ): Promise<MealPlan> {
    const meal = await MealPlan.create(
      {
        recipeId: input.recipeId,
        plannedOn: fromIsoDate(input.plannedOn),
        slot: input.slot,
        servings: input.servings,
        captureText: meta.captureText ?? null,
      },
      { client: trx }
    )
    trx.after('commit', () => emitter.emit('menu:meal_planned', { mealPlanId: meal.id }))
    return meal
  }

  async between(start: string, end: string): Promise<MealPlanRow[]> {
    const meals = await MealPlan.query()
      .whereBetween('planned_on', [start, end])
      .preload('recipe')
      .orderBy('planned_on')
      .orderBy('slot')
    return meals.map((meal) => ({
      id: meal.id,
      outcome: meal.outcome,
      plannedOn: toIsoDate(meal.plannedOn),
      slot: meal.slot,
      servings: meal.servings,
      recipe: { id: meal.recipe.id, name: meal.recipe.name },
    }))
  }

  /**
   * What to buy for a planned meal, with a human readable reason.
   */
  async shoppingNeeds(
    mealPlanId: number
  ): Promise<{ needs: ShoppingNeed[]; reason: string } | null> {
    const meal = await MealPlan.query().where('id', mealPlanId).preload('recipe').first()
    if (!meal) return null
    const needs = await this.recipes.shoppingNeeds(meal.recipeId, meal.servings)
    return { needs, reason: `${meal.recipe.name} · ${meal.plannedOn.toFormat('dd/LL')}` }
  }

  /**
   * What happened to a planned meal, told by the daily review.
   */
  async setOutcome(id: number, outcome: MealOutcome, trx?: TransactionClientContract) {
    const run = async (client: TransactionClientContract) => {
      const meal = await MealPlan.findOrFail(id, { client })
      const wasCooked = meal.outcome === 'cooked'
      meal.outcome = outcome
      await meal.useTransaction(client).save()

      /**
       * A cooked meal uses the stock (`menu:meal_cooked` in PROJECT.md):
       * done here, in the same transaction, since the stock is Menu's own.
       * Changing one's mind gives it back.
       */
      const source = { type: 'meal_plan', id: meal.id }
      if (outcome === 'cooked' && !wasCooked) {
        const needs = await this.recipes.shoppingNeeds(meal.recipeId, meal.servings, client)
        await this.pantry.consume(source, needs, client)
      } else if (outcome !== 'cooked' && wasCooked) {
        await this.pantry.revert(source, client)
      }
      return meal
    }
    return trx ? run(trx) : db.transaction(run)
  }

  async delete(id: number, trx?: TransactionClientContract) {
    const meal = await MealPlan.find(id, { client: trx })
    if (!meal) return
    if (meal.outcome === 'cooked' && trx) await this.pantry.revert({ type: 'meal_plan', id }, trx)
    await meal.delete()
  }
}
