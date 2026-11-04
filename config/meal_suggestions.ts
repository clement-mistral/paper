/**
 * Weights of the meal suggestions (PROJECT.md §7). Deterministic and
 * explainable: every point of the score has a reason shown to the user.
 */
const mealSuggestionsConfig = {
  /** Points for a recipe whose every non-staple ingredient is available. */
  coverageWeight: 100,
  /** A main ingredient counts this many times in the coverage. */
  mainIngredientWeight: 2,
  /** Malus per missing ingredient, heavier for a main one. */
  missingMalus: 8,
  missingMainMalus: 20,
  /** A substitute available halves the malus of what it replaces. */
  substitutionFactor: 0.5,
  /** Bonus per ingredient used that expires within `expiringDays`. */
  expiringBonus: 15,
  expiringDays: 3,
  /** Malus when the recipe was planned during the last `recentDays`. */
  recentMalus: 25,
  recentDays: 7,
  /** Suggestions below this score are not shown. */
  minScore: 20,
}

export default mealSuggestionsConfig
