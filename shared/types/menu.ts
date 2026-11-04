/**
 * Menu types shared by the server and the client.
 */

export const UNITS = [
  'piece',
  'g',
  'kg',
  'ml',
  'cl',
  'l',
  'cas',
  'cac',
  'pincee',
  'tranche',
] as const

export type Unit = (typeof UNITS)[number]

export const MEAL_SLOTS = ['lunch', 'dinner'] as const

export type MealSlot = (typeof MEAL_SLOTS)[number]

export type IngredientSummary = {
  id: number
  name: string
  defaultUnit: Unit
  isStaple: boolean
  recipeCount: number
}

export type IngredientDetail = IngredientSummary & {
  aliases: string[]
  substitutions: SubstitutionRow[]
}

export type RecipeIngredientRow = {
  ingredientId: number
  name: string
  quantity: number | null
  unit: Unit | null
  isMain: boolean
  isStaple: boolean
}

export type RecipeSummary = {
  id: number
  name: string
  servings: number
  totalMinutes: number | null
  ingredientCount: number
  isDraft: boolean
}

export type RecipeDetail = RecipeSummary & {
  prepMinutes: number | null
  cookMinutes: number | null
  steps: string | null
  notes: string | null
  keywords: string[]
  ingredients: RecipeIngredientRow[]
  meals: MealPlanRow[]
}

export const MEAL_OUTCOMES = ['cooked', 'other', 'eaten_out'] as const

export type MealOutcome = (typeof MEAL_OUTCOMES)[number]

export type MealPlanRow = {
  id: number
  outcome: MealOutcome | null
  plannedOn: string
  slot: MealSlot
  servings: number
  recipe: { id: number; name: string }
}

/* -------------------------------------------------------------------------
 * Stock (frigo, placards, congélateur) and meal suggestions.
 * ---------------------------------------------------------------------- */

export const PANTRY_LOCATIONS = ['fridge', 'cupboard', 'freezer'] as const

export type PantryLocation = (typeof PANTRY_LOCATIONS)[number]

export const PANTRY_LOCATION_LABELS: Record<PantryLocation, string> = {
  fridge: 'Frigo',
  cupboard: 'Placards',
  freezer: 'Congélateur',
}

export type PantryRow = {
  id: number
  ingredientId: number
  name: string
  location: PantryLocation
  /** Null: « il y en a », quantity unknown. */
  quantity: number | null
  unit: Unit | null
  expiresOn: string | null
  /** Expired, expiring within the anti-waste window, or fine. */
  freshness: 'expired' | 'soon' | 'ok'
}

export type MealSuggestion = {
  recipe: { id: number; name: string; servings: number; totalMinutes: number | null }
  score: number
  /** Share of the non-staple ingredients available, 0 to 1. */
  coverage: number
  /** Why it is suggested, in plain words. */
  reasons: string[]
  missing: string[]
  substitutions: Array<{ missing: string; with: string }>
}

export type SubstitutionRow = {
  id: number
  substituteId: number
  name: string
  note: string | null
}

/**
 * A recipe read from a page (schema.org/Recipe), to review before saving.
 */
export type ImportedRecipeDraft = {
  name: string
  servings: number
  prepMinutes: number | null
  cookMinutes: number | null
  steps: string | null
  sourceUrl: string
  ingredients: Array<{
    line: string
    name: string
    quantity: number | null
    unit: Unit | null
    /** Matched to an ingredient of the catalogue. */
    known: boolean
  }>
}
