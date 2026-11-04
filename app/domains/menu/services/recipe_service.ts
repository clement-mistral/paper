import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Recipe from '#domains/menu/models/recipe'
import RecipeIngredient from '#domains/menu/models/recipe_ingredient'
import IngredientService from '#domains/menu/services/ingredient_service'
import AliasService from '#capture/services/alias_service'
import { normalize, normalizePhrases } from '#capture/normalizer'
import { toIsoDate } from '#support/dates'
import type { RecipeDetail, RecipeSummary, Unit } from '#shared/types/menu'

export type RecipeInput = {
  name: string
  servings: number
  prepMinutes?: number
  cookMinutes?: number
  steps?: string
  notes?: string
  keywords?: string
  ingredients?: Array<{ name: string; quantity?: number; unit?: Unit; isMain?: boolean }>
}

/**
 * An ingredient needed for a meal, scaled to its servings.
 */
export type ShoppingNeed = {
  ingredientId: number
  label: string
  quantity: number | null
  unit: Unit | null
}

/**
 * Public service of the Menu domain for recipes.
 */
@inject()
export default class RecipeService {
  constructor(
    private aliases: AliasService,
    private ingredients: IngredientService
  ) {}

  async list(): Promise<RecipeSummary[]> {
    const recipes = await Recipe.query().withCount('ingredients').orderBy('name')
    return recipes.map((recipe) => this.toSummary(recipe))
  }

  async detail(id: number): Promise<RecipeDetail> {
    const recipe = await Recipe.query()
      .where('id', id)
      .withCount('ingredients')
      .preload('ingredients', (query) => query.preload('ingredient').orderBy('position'))
      .preload('meals', (query) => query.orderBy('planned_on', 'desc').limit(20))
      .firstOrFail()

    const phrases = await this.aliases.manualPhrases('recipe', id)

    return {
      ...this.toSummary(recipe),
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      steps: recipe.steps,
      notes: recipe.notes,
      keywords: phrases.filter((phrase) => phrase !== normalize(recipe.name)),
      ingredients: recipe.ingredients.map((row) => ({
        ingredientId: row.ingredientId,
        name: row.ingredient.name,
        quantity: row.quantity,
        unit: row.unit,
        isMain: row.isMain,
        isStaple: row.ingredient.isStaple,
      })),
      meals: recipe.meals.map((meal) => ({
        id: meal.id,
        outcome: meal.outcome,
        plannedOn: toIsoDate(meal.plannedOn),
        slot: meal.slot,
        servings: meal.servings,
        recipe: { id: recipe.id, name: recipe.name },
      })),
    }
  }

  /**
   * Recipe for a normalized text: alias first (name, keywords, learned
   * corrections), then the closest name.
   */
  async match(text: string): Promise<Recipe | null> {
    if (text === '') return null
    const alias = await this.aliases.findInText('recipe', text)
    if (alias) return Recipe.find(alias.entityId)

    const similarity =
      'greatest(word_similarity(unaccent(lower(name)), ?), word_similarity(?, unaccent(lower(name))))'
    return Recipe.query()
      .select('recipes.*')
      .select(db.raw(`${similarity} as score`, [text, text]))
      .whereRaw(`${similarity} >= 0.6`, [text, text])
      .orderBy('score', 'desc')
      .first()
  }

  async drafts(): Promise<Array<{ id: number; name: string }>> {
    const recipes = await Recipe.query().where('is_draft', true).orderBy('name')
    return recipes.map(({ id, name }) => ({ id, name }))
  }

  async options(): Promise<Array<{ id: number; name: string; servings: number }>> {
    const recipes = await Recipe.query().orderBy('name')
    return recipes.map(({ id, name, servings }) => ({ id, name, servings }))
  }

  async create(input: RecipeInput): Promise<Recipe> {
    return db.transaction(async (trx) => {
      const recipe = new Recipe().useTransaction(trx)
      this.fill(recipe, input)
      await recipe.save()
      await this.syncIngredients(recipe, input, trx)
      await this.syncKeywords(recipe, input.keywords, trx)
      return recipe
    })
  }

  /**
   * Minimal recipe created from the capture (« raclette samedi »), flagged
   * as a draft to complete later.
   */
  async createDraft(name: string, servings: number, trx: TransactionClientContract) {
    const recipe = await Recipe.create({ name, servings, isDraft: true }, { client: trx })
    await this.syncKeywords(recipe, '', trx)
    trx.after('commit', () => this.changed(recipe.id))
    return recipe
  }

  async update(id: number, input: RecipeInput): Promise<Recipe> {
    return db.transaction(async (trx) => {
      const recipe = await Recipe.findOrFail(id, { client: trx })
      this.fill(recipe, input)
      recipe.isDraft = false
      await recipe.save()
      await this.syncIngredients(recipe, input, trx)
      await this.syncKeywords(recipe, input.keywords, trx)
      trx.after('commit', () => this.changed(recipe.id))
      return recipe
    })
  }

  async delete(id: number) {
    await db.transaction(async (trx) => {
      const recipe = await Recipe.findOrFail(id, { client: trx })
      await this.aliases.removeFor('recipe', id, trx)
      await recipe.delete()
      trx.after('commit', () => this.changed(id))
    })
  }

  /**
   * Cancels a draft created by the capture. A recipe completed since then
   * is kept.
   */
  async undoDraft(id: number, trx: TransactionClientContract) {
    const recipe = await Recipe.find(id, { client: trx })
    if (!recipe || !recipe.isDraft) return
    await this.aliases.removeFor('recipe', id, trx)
    await recipe.delete()
    trx.after('commit', () => this.changed(id))
  }

  private changed(recipeId: number) {
    return emitter.emit('menu:recipe_changed', { recipeId })
  }

  /**
   * Ingredients to buy for a recipe cooked for `servings` people. Staples
   * (salt, oil…) are left out; quantities follow the servings.
   */
  async shoppingNeeds(
    recipeId: number,
    servings: number,
    client?: TransactionClientContract
  ): Promise<ShoppingNeed[]> {
    const recipe = await Recipe.query({ client })
      .where('id', recipeId)
      .preload('ingredients', (query) => query.preload('ingredient').orderBy('position'))
      .firstOrFail()

    const ratio = recipe.servings > 0 ? servings / recipe.servings : 1
    return recipe.ingredients
      .filter((row) => !row.ingredient.isStaple)
      .map((row) => ({
        ingredientId: row.ingredientId,
        label: row.ingredient.name,
        quantity: row.quantity === null ? null : Math.round(row.quantity * ratio * 100) / 100,
        unit: row.unit,
      }))
  }

  private fill(recipe: Recipe, input: RecipeInput) {
    recipe.merge({
      name: input.name,
      servings: input.servings,
      prepMinutes: input.prepMinutes ?? null,
      cookMinutes: input.cookMinutes ?? null,
      steps: input.steps ?? null,
      notes: input.notes ?? null,
    })
  }

  private async syncIngredients(
    recipe: Recipe,
    input: RecipeInput,
    trx: TransactionClientContract
  ) {
    await RecipeIngredient.query({ client: trx }).where('recipe_id', recipe.id).delete()

    let position = 0
    for (const row of input.ingredients ?? []) {
      if (row.name.trim() === '') continue
      const ingredient = await this.ingredients.findOrCreate(row.name, trx)
      await RecipeIngredient.create(
        {
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          quantity: row.quantity ?? null,
          unit: row.unit ?? ingredient.defaultUnit,
          isMain: row.isMain ?? false,
          position: position++,
        },
        { client: trx }
      )
    }
  }

  /**
   * The recipe name is always a keyword, so « carbonara jeudi » finds
   * « Pâtes carbonara » through the fuzzy name match and « pâtes
   * carbonara » through the alias.
   */
  private async syncKeywords(
    recipe: Recipe,
    keywords: string | undefined,
    trx: TransactionClientContract
  ) {
    const phrases = normalizePhrases([recipe.name, keywords ?? ''].join(','))
    await this.aliases.syncManual('recipe', recipe.id, phrases, trx)
  }

  private toSummary(recipe: Recipe): RecipeSummary {
    const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
    return {
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      totalMinutes: total > 0 ? total : null,
      ingredientCount: Number(recipe.$extras.ingredients_count ?? 0),
      isDraft: recipe.isDraft,
    }
  }
}
