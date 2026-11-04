import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, CaptureRef, IntentDraft } from '#capture/intent'
import {
  cleanLabel,
  cutSpans,
  extractAmount,
  extractDate,
  extractServings,
  removeWords,
} from '#capture/extractors'
import {
  dateField,
  hasOverride,
  isoDate,
  numberField,
  pick,
  read,
  selectField,
  textField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import AliasService from '#capture/services/alias_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RecipeService from '#domains/menu/services/recipe_service'
import { mealValidator } from '#domains/menu/validators/meal'
import { fromIsoDate, now, today } from '#support/dates'
import { formatLongDate, slotLabels } from '#support/format'
import type { CaptureEffect, CaptureOverrides } from '#shared/types/capture'
import type { MealSlot } from '#shared/types/menu'

const LUNCH_WORDS = ['midi', 'dejeuner', 'dej']
const DINNER_WORDS = ['soir', 'diner', 'souper']
const KEYWORDS = ['repas', 'manger', 'mange', 'menu', 'cuisiner']

/**
 * Words removed before reading the dish name (« on mange une raclette
 * samedi soir » → « raclette »).
 */
const NOISE = [
  ...LUNCH_WORDS,
  ...DINNER_WORDS,
  ...KEYWORDS,
  'cuisine',
  'prepare',
  'on',
  'ce',
  'au',
  'c',
  'est',
  'se',
  'fait',
]

const DEFAULT_SERVINGS = 4

export type ParsedMeal = {
  dish: string
  plannedOn: DateTime | null
  slot: MealSlot | null
  servings: number | null
}

/**
 * Pure extraction step of the meal intent.
 */
export function parseMeal(raw: string, reference: DateTime = now()): ParsedMeal {
  const servings = extractServings(raw)
  const withoutServings = servings ? cutSpans(raw, [servings]) : raw
  const date = extractDate(withoutServings, 'future', reference)
  const rest = date ? cutSpans(withoutServings, [date]) : withoutServings

  const words = normalize(raw).split(' ')
  let slot: MealSlot | null = null
  if (words.some((word) => DINNER_WORDS.includes(word))) slot = 'dinner'
  else if (words.some((word) => LUNCH_WORDS.includes(word))) slot = 'lunch'

  return {
    dish: cleanLabel(removeWords(rest, NOISE)),
    plannedOn: date?.date ?? null,
    slot,
    servings: servings?.servings ?? null,
  }
}

/**
 * « carbonara jeudi soir », « raclette samedi pour 6 », « midi : salade
 * niçoise demain » → a planned meal. An unknown dish creates a draft
 * recipe; the recipe ingredients go to the shopping list.
 */
@inject()
export default class MealIntent implements CaptureIntent {
  info = { name: 'meal', label: 'Repas', domain: 'menu' } as const
  keywords = KEYWORDS

  constructor(
    private aliases: AliasService,
    private recipes: RecipeService,
    private meals: MealPlanService
  ) {}

  async score(input: NormalizedInput): Promise<number> {
    let score = 0
    if (input.tokens.some((token) => [...LUNCH_WORDS, ...DINNER_WORDS].includes(token))) {
      score += 0.4
    }
    if (matchedKeywords(input, this.keywords).length > 0) score += 0.4
    if (await this.matchRecipe(input.raw)) score += 0.5
    if (score === 0) return 0
    if (extractDate(input.raw, 'future')) score += 0.1
    /**
     * A price means money (« diner resto 40 € » is an expense).
     */
    if (extractAmount(input.raw)?.explicit) score -= 0.5
    return Math.max(0, Math.min(score, 1))
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }

    const { plannedOn, slot, servings } = draft.data
    const effects: CaptureEffect[] = [
      {
        domain: 'menu',
        title: `Repas planifié · ${formatLongDate(fromIsoDate(plannedOn))}, ${slotLabels[slot]}`,
        detail: `${draft.recipeName} · ${servings} personne${servings > 1 ? 's' : ''}`,
      },
    ]

    if (draft.data.recipeId === null) {
      effects.push({
        domain: 'menu',
        title: `Nouvelle recette « ${draft.recipeName} »`,
        detail: 'Brouillon à compléter dans Fiches › Recettes (ingrédients, étapes)',
      })
    } else {
      const needs = await this.recipes.shoppingNeeds(draft.data.recipeId, servings)
      effects.push(
        needs.length > 0
          ? {
              domain: 'menu',
              title: `Courses : ${needs.length} article${needs.length > 1 ? 's' : ''} ajouté${needs.length > 1 ? 's' : ''}`,
              detail: needs.map((need) => need.label).join(', '),
            }
          : { domain: 'menu', title: 'Rien à ajouter aux courses' }
      )
    }

    return { status: 'ready', intent: this.info, fields: draft.fields, missing: [], effects }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    const data = await mealValidator.validate({
      ...draft.data,
      newRecipeName: draft.data.recipeId === null ? draft.recipeName : null,
    })

    const created: CaptureRef[] = []
    let recipeId = data.recipeId
    if (recipeId === null) {
      const recipe = await this.recipes.createDraft(data.newRecipeName ?? '', data.servings, trx)
      recipeId = recipe.id
      created.push({ type: 'recipe', id: recipe.id })
    } else if (draft.recipeOverridden && recipeId !== draft.matchedRecipeId && draft.dish) {
      /**
       * The user picked another recipe for that dish: remember it.
       */
      await this.aliases.learn('recipe', recipeId, draft.dish, trx)
    }

    const meal = await this.meals.plan({ ...data, recipeId }, trx, { captureText: input.original })
    created.unshift({ type: 'meal_plan', id: meal.id })

    return {
      message: `Repas planifié : ${draft.recipeName}, ${formatLongDate(fromIsoDate(data.plannedOn)).toLowerCase()} ${slotLabels[data.slot]}`,
      created,
    }
  }

  private async matchRecipe(raw: string) {
    const parsed = parseMeal(raw)
    return this.recipes.match(normalize(parsed.dish))
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseMeal(input.raw)
    const [matched, options] = await Promise.all([
      this.recipes.match(normalize(parsed.dish)),
      this.recipes.options(),
    ])

    const recipeOverridden = hasOverride(overrides, 'recipeId')
    let recipeId: number | null = matched?.id ?? null
    if (recipeOverridden) {
      recipeId = overrides.recipeId === 'new' ? null : read.id(overrides.recipeId ?? null)
    }

    const newName = pick(overrides, 'newRecipeName', parsed.dish, read.text)
    const recipe = options.find(({ id }) => id === recipeId) ?? null
    const recipeName = recipe?.name ?? newName.value

    const plannedOn = pick(
      overrides,
      'plannedOn',
      isoDate(parsed.plannedOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const defaultSlot: MealSlot = now().hour < 14 ? 'lunch' : 'dinner'
    const slot = pick<MealSlot>(overrides, 'slot', parsed.slot ?? defaultSlot, (value) =>
      value === 'lunch' ? 'lunch' : 'dinner'
    )
    const servings = pick(
      overrides,
      'servings',
      parsed.servings ?? recipe?.servings ?? DEFAULT_SERVINGS,
      (value) => read.number(value) ?? DEFAULT_SERVINGS
    )

    const fields = [
      selectField(
        'recipeId',
        'Recette',
        recipe ? recipe.id : 'new',
        [
          {
            value: 'new',
            label: newName.value ? `Nouvelle : ${newName.value}` : 'Nouvelle recette',
          },
          ...options.map(({ id, name }) => ({ value: id, label: name })),
        ],
        recipeOverridden ? 'override' : recipe ? 'matched' : 'empty',
        true
      ),
      ...(recipe ? [] : [textField('newRecipeName', 'Nom', newName.value, newName.overridden)]),
      dateField('plannedOn', 'Date', plannedOn.value, plannedOn.overridden, !!parsed.plannedOn),
      selectField(
        'slot',
        'Repas',
        slot.value,
        [
          { value: 'lunch', label: 'Midi' },
          { value: 'dinner', label: 'Soir' },
        ],
        slot.overridden ? 'override' : parsed.slot ? 'parsed' : 'default',
        true
      ),
      numberField('servings', 'Personnes', servings.value, servings.overridden, {
        parsed: parsed.servings !== null,
        fallback: 'default',
      }),
    ]

    const missing: string[] = []
    if (!recipe && newName.value === '') missing.push('Recette')

    return {
      data: {
        recipeId: recipe?.id ?? null,
        plannedOn: plannedOn.value,
        slot: slot.value,
        servings: Math.round(servings.value),
      },
      dish: parsed.dish,
      recipeName,
      matchedRecipeId: matched?.id ?? null,
      recipeOverridden,
      fields,
      missing,
    }
  }
}
