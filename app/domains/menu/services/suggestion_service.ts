import { inject } from '@adonisjs/core'
import MealPlan from '#domains/menu/models/meal_plan'
import Recipe from '#domains/menu/models/recipe'
import IngredientService from '#domains/menu/services/ingredient_service'
import PantryService from '#domains/menu/services/pantry_service'
import { convert } from '#domains/menu/services/units'
import mealSuggestionsConfig from '#config/meal_suggestions'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import { formatDate } from '#support/format'
import type { MealSuggestion, Unit } from '#shared/types/menu'

type Stock = Map<
  number,
  Array<{ quantity: number | null; unit: Unit | null; expiresOn: string | null }>
>

export type SuggestionInput = {
  recipe: { id: number; name: string; servings: number; totalMinutes: number | null }
  ingredients: Array<{
    ingredientId: number
    name: string
    quantity: number | null
    unit: Unit | null
    isMain: boolean
    isStaple: boolean
  }>
  /** Planned during the last `recentDays`. */
  recentlyPlanned: boolean
}

const config = mealSuggestionsConfig

/**
 * Whether the stock covers what a recipe needs of an ingredient: any
 * quantity when the recipe gives none, or enough once units convert.
 */
function covers(
  stock: Stock,
  ingredientId: number,
  quantity: number | null,
  unit: Unit | null
): 'yes' | 'short' | 'no' {
  const rows = stock.get(ingredientId)
  if (!rows || rows.length === 0) return 'no'
  if (quantity === null || rows.some((row) => row.quantity === null)) return 'yes'
  const total = rows.reduce((sum, row) => sum + (convert(row.quantity!, row.unit, unit) ?? 0), 0)
  return total >= quantity ? 'yes' : 'short'
}

/**
 * Pure scoring of one recipe (PROJECT.md §7): coverage of the non-staple
 * ingredients, anti-waste bonus, malus per missing ingredient (heavier for
 * a main one, halved when a substitute is available), malus when planned
 * recently. Every point comes with its reason.
 */
export function scoreRecipe(
  input: SuggestionInput,
  stock: Stock,
  substitutes: Map<number, number[]>,
  names: Map<number, string>,
  day: string
): MealSuggestion {
  const needed = input.ingredients.filter((row) => !row.isStaple)
  const expiringLimit = toIsoDate(today().plus({ days: config.expiringDays }))
  let weightTotal = 0
  let weightAvailable = 0
  let score = 0
  const missing: string[] = []
  const substitutions: MealSuggestion['substitutions'] = []
  const expiring: string[] = []

  for (const row of needed) {
    const weight = row.isMain ? config.mainIngredientWeight : 1
    weightTotal += weight
    const status = covers(stock, row.ingredientId, row.quantity, row.unit)
    if (status === 'yes') {
      weightAvailable += weight
      const soonest = (stock.get(row.ingredientId) ?? [])
        .map((entry) => entry.expiresOn)
        .filter((date): date is string => date !== null && date >= day && date <= expiringLimit)
        .sort()[0]
      if (soonest) {
        score += config.expiringBonus
        expiring.push(`${row.name.toLowerCase()} (${formatDate(fromIsoDate(soonest))})`)
      }
      continue
    }
    const malus = row.isMain ? config.missingMainMalus : config.missingMalus
    const substitute = (substitutes.get(row.ingredientId) ?? []).find(
      (id) => covers(stock, id, null, null) === 'yes'
    )
    if (substitute) {
      score -= malus * config.substitutionFactor
      weightAvailable += weight * config.substitutionFactor
      substitutions.push({ missing: row.name, with: names.get(substitute) ?? '?' })
    } else {
      score -= malus
      missing.push(status === 'short' ? `${row.name} (pas assez)` : row.name)
    }
  }

  const coverage = weightTotal === 0 ? 1 : weightAvailable / weightTotal
  score += coverage * config.coverageWeight

  const reasons: string[] = []
  if (needed.length === 0) reasons.push('Uniquement des basiques')
  else if (missing.length === 0 && substitutions.length === 0) reasons.push('Tout est disponible')
  else {
    const have = needed.length - missing.length - substitutions.length
    reasons.push(
      `${have} ingrédient${have > 1 ? 's' : ''} sur ${needed.length} disponible${needed.length > 1 ? 's' : ''}`
    )
  }
  if (expiring.length > 0) reasons.push(`Utilise ${expiring.join(', ')} qui périme bientôt`)
  for (const swap of substitutions) {
    reasons.push(
      `Faisable en remplaçant ${swap.missing.toLowerCase()} par ${swap.with.toLowerCase()}`
    )
  }
  if (missing.length > 0) reasons.push(`Manque : ${missing.join(', ').toLowerCase()}`)
  if (input.recentlyPlanned) {
    score -= config.recentMalus
    reasons.push('Déjà au menu ces derniers jours')
  }

  return {
    recipe: input.recipe,
    score: Math.round(score),
    coverage: Math.round(coverage * 100) / 100,
    reasons,
    missing,
    substitutions,
  }
}

/**
 * Public service of the Menu domain for meal suggestions: what to cook
 * with what is in the fridge and the cupboards. Rules and weights only
 * (config/meal_suggestions.ts), never a language model.
 */
@inject()
export default class SuggestionService {
  constructor(
    private pantry: PantryService,
    private ingredients: IngredientService
  ) {}

  async suggest(limit = 5): Promise<MealSuggestion[]> {
    const day = toIsoDate(today())
    const recentStart = toIsoDate(today().minus({ days: config.recentDays }))
    const [recipes, stock, substitutes, recent] = await Promise.all([
      Recipe.query()
        .where('is_draft', false)
        .preload('ingredients', (query) => query.preload('ingredient')),
      this.pantry.availability(),
      this.ingredients.substitutionMap(),
      MealPlan.query().whereBetween('planned_on', [
        recentStart,
        toIsoDate(today().plus({ days: 7 })),
      ]),
    ])
    const recentIds = new Set(recent.map((meal) => meal.recipeId))
    const names = new Map<number, string>()
    for (const recipe of recipes) {
      for (const row of recipe.ingredients) names.set(row.ingredientId, row.ingredient.name)
    }
    const substituteIds = [...new Set([...substitutes.values()].flat())].filter(
      (id) => !names.has(id)
    )
    if (substituteIds.length > 0) {
      const extra = await this.ingredients.namesFor(substituteIds)
      for (const [id, name] of extra) names.set(id, name)
    }

    return recipes
      .filter((recipe) => recipe.ingredients.length > 0)
      .map((recipe) =>
        scoreRecipe(
          {
            recipe: {
              id: recipe.id,
              name: recipe.name,
              servings: recipe.servings,
              totalMinutes:
                recipe.prepMinutes === null && recipe.cookMinutes === null
                  ? null
                  : (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0),
            },
            ingredients: recipe.ingredients.map((row) => ({
              ingredientId: row.ingredientId,
              name: row.ingredient.name,
              quantity: row.quantity,
              unit: row.unit,
              isMain: row.isMain,
              isStaple: row.ingredient.isStaple,
            })),
            recentlyPlanned: recentIds.has(recipe.id),
          },
          stock,
          substitutes,
          names,
          day
        )
      )
      .filter((suggestion) => suggestion.score >= config.minScore)
      .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name, 'fr'))
      .slice(0, limit)
  }
}
