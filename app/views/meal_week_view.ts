import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RecipeService from '#domains/menu/services/recipe_service'
import SuggestionService from '#domains/menu/services/suggestion_service'
import ShoppingService from '#domains/lists/services/shopping_service'
import { toIsoDate, today } from '#support/dates'
import { MEAL_SLOTS, type MealProposal, type MealWeek } from '#shared/types/menu'

/**
 * Monday of the week of `day` (ISO weeks start on Monday).
 */
export function weekStart(day: DateTime): DateTime {
  return day.startOf('week')
}

/**
 * Proposals for the empty dinners: the best suggestions in order, each
 * recipe once, none already in the week. Deterministic.
 */
export function proposeDinners(
  emptyDays: string[],
  suggestions: Array<{ recipe: MealProposal['recipe']; reasons: string[] }>,
  plannedRecipeIds: Set<number>
): Map<string, MealProposal> {
  const proposals = new Map<string, MealProposal>()
  const available = suggestions.filter((suggestion) => !plannedRecipeIds.has(suggestion.recipe.id))
  emptyDays.forEach((day, index) => {
    const suggestion = available[index]
    if (suggestion) proposals.set(day, { recipe: suggestion.recipe, reasons: suggestion.reasons })
  })
  return proposals
}

/**
 * Read model of « Repas de la semaine ». Read only.
 */
@inject()
export default class MealWeekView {
  constructor(
    private meals: MealPlanService,
    private recipes: RecipeService,
    private suggestions: SuggestionService,
    private shopping: ShoppingService
  ) {}

  async week(day: DateTime = today()): Promise<MealWeek> {
    const start = weekStart(day)
    const end = start.plus({ days: 6 })
    const todayIso = toIsoDate(today())
    const [meals, recipes, shoppingCount] = await Promise.all([
      this.meals.between(toIsoDate(start), toIsoDate(end)),
      this.recipes.options(),
      this.shopping.pendingCount(),
    ])

    const dates = Array.from({ length: 7 }, (_, index) => toIsoDate(start.plus({ days: index })))
    const emptyDinners = dates.filter(
      (date) =>
        date >= todayIso && !meals.some((meal) => meal.plannedOn === date && meal.slot === 'dinner')
    )
    const suggestions =
      emptyDinners.length === 0
        ? []
        : await this.suggestions.suggest(emptyDinners.length + meals.length, { minScore: null })
    const proposals = proposeDinners(
      emptyDinners,
      suggestions.map(({ recipe, reasons }) => ({
        recipe: { id: recipe.id, name: recipe.name, servings: recipe.servings },
        reasons,
      })),
      new Set(meals.map((meal) => meal.recipe.id))
    )

    return {
      start: toIsoDate(start),
      previous: toIsoDate(start.minus({ weeks: 1 })),
      next: toIsoDate(start.plus({ weeks: 1 })),
      isCurrent: toIsoDate(start) === toIsoDate(weekStart(today())),
      days: dates.map((date) => ({
        date,
        past: date < todayIso,
        meals: Object.fromEntries(
          MEAL_SLOTS.map((slot) => [
            slot,
            meals.filter((meal) => meal.plannedOn === date && meal.slot === slot),
          ])
        ) as MealWeek['days'][number]['meals'],
        proposal: proposals.get(date) ?? null,
      })),
      recipes,
      shoppingCount,
    }
  }
}
