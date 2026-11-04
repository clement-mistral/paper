import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Ingredient from '#domains/menu/models/ingredient'
import IngredientSubstitution from '#domains/menu/models/ingredient_substitution'
import AliasService from '#capture/services/alias_service'
import { normalizePhrases, singularKey } from '#capture/normalizer'
import type { IngredientDetail, IngredientSummary, Unit } from '#shared/types/menu'

export type IngredientInput = {
  name: string
  defaultUnit: Unit
  isStaple?: boolean
  aliases?: string
}

/**
 * Public service of the Menu domain for the ingredient catalogue. The
 * catalogue grows on the fly: typing an unknown ingredient creates it.
 */
@inject()
export default class IngredientService {
  constructor(private aliases: AliasService) {}

  async list(): Promise<IngredientSummary[]> {
    const ingredients = await Ingredient.query()
      .select('ingredients.*')
      .select(
        db.raw(
          '(select count(distinct ri.recipe_id) from recipe_ingredients ri where ri.ingredient_id = ingredients.id)::int as recipe_count'
        )
      )
      .orderBy('name')
    return ingredients.map((ingredient) => this.toSummary(ingredient))
  }

  async detail(id: number): Promise<IngredientDetail> {
    const ingredient = await Ingredient.query()
      .select('ingredients.*')
      .select(
        db.raw(
          '(select count(distinct ri.recipe_id) from recipe_ingredients ri where ri.ingredient_id = ingredients.id)::int as recipe_count'
        )
      )
      .where('id', id)
      .firstOrFail()
    const [aliases, substitutions] = await Promise.all([
      this.aliases.manualPhrases('ingredient', id),
      IngredientSubstitution.query().where('ingredient_id', id).preload('substitute').orderBy('id'),
    ])
    return {
      ...this.toSummary(ingredient),
      aliases,
      substitutions: substitutions.map((row) => ({
        id: row.id,
        substituteId: row.substituteId,
        name: row.substitute.name,
        note: row.note,
      })),
    }
  }

  /**
   * « Faisable en remplaçant X par Y »: `substitute` can stand in for the
   * ingredient. Created by name, like everything in the catalogue.
   */
  async addSubstitution(ingredientId: number, substituteName: string, note?: string | null) {
    return db.transaction(async (trx) => {
      const ingredient = await Ingredient.findOrFail(ingredientId, { client: trx })
      const substitute = await this.findOrCreate(substituteName, trx)
      if (substitute.id === ingredient.id) {
        throw new Exception('Un ingrédient ne se remplace pas par lui-même', { status: 422 })
      }
      await trx.rawQuery(
        `insert into ingredient_substitutions (ingredient_id, substitute_id, note, created_at, updated_at)
         values (?, ?, nullif(?, ''), now(), now())
         on conflict (ingredient_id, substitute_id) do nothing`,
        [ingredient.id, substitute.id, note ?? '']
      )
    })
  }

  async removeSubstitution(id: number): Promise<IngredientSubstitution> {
    const row = await IngredientSubstitution.findOrFail(id)
    await row.delete()
    return row
  }

  async namesFor(ids: number[]): Promise<Map<number, string>> {
    const rows = await Ingredient.query().whereIn('id', ids)
    return new Map(rows.map((row) => [row.id, row.name]))
  }

  /**
   * Every substitution, ingredient id → substitute ids.
   */
  async substitutionMap(): Promise<Map<number, number[]>> {
    const rows = await IngredientSubstitution.all()
    const map = new Map<number, number[]>()
    for (const row of rows) {
      map.set(row.ingredientId, [...(map.get(row.ingredientId) ?? []), row.substituteId])
    }
    return map
  }

  /**
   * The ingredient with that name (singular, accents ignored), created
   * when it does not exist yet.
   */
  async findOrCreate(name: string, trx: TransactionClientContract): Promise<Ingredient> {
    const key = singularKey(name)
    const existing = await Ingredient.query({ client: trx }).where('key', key).first()
    if (existing) return existing

    const alias = await this.aliases.findInText('ingredient', key)
    if (alias) {
      const aliased = await Ingredient.find(alias.entityId, { client: trx })
      if (aliased) return aliased
    }

    return Ingredient.create(
      { name: name.trim().replace(/^./, (c) => c.toUpperCase()), key, defaultUnit: 'piece' },
      { client: trx }
    )
  }

  /**
   * Ingredient for a free text (« lait », « des oeufs ») without creating
   * anything: alias, exact key, then trigram similarity.
   */
  async match(text: string): Promise<Ingredient | null> {
    const key = singularKey(text)
    if (key === '') return null

    const exact = await Ingredient.findBy('key', key)
    if (exact) return exact

    const alias = await this.aliases.findInText('ingredient', key)
    if (alias) return Ingredient.find(alias.entityId)

    return Ingredient.query()
      .select('ingredients.*')
      .select(db.raw('similarity(key, ?) as score', [key]))
      .whereRaw('similarity(key, ?) >= 0.6', [key])
      .orderBy('score', 'desc')
      .first()
  }

  async update(id: number, input: IngredientInput): Promise<Ingredient> {
    return db.transaction(async (trx) => {
      const ingredient = await Ingredient.findOrFail(id, { client: trx })
      const key = singularKey(input.name)
      const clash = await Ingredient.query({ client: trx })
        .where('key', key)
        .whereNot('id', id)
        .first()
      if (clash) {
        throw new Exception(`« ${clash.name} » existe déjà`, { status: 422 })
      }
      ingredient.merge({
        name: input.name,
        key,
        defaultUnit: input.defaultUnit,
        isStaple: input.isStaple ?? false,
      })
      await ingredient.save()
      await this.aliases.syncManual('ingredient', id, normalizePhrases(input.aliases), trx)
      return ingredient
    })
  }

  /**
   * Refused while a recipe still uses the ingredient.
   */
  async delete(id: number) {
    await db.transaction(async (trx) => {
      const used = await trx.from('recipe_ingredients').where('ingredient_id', id).first()
      if (used) {
        throw new Exception('Cet ingrédient est utilisé par une recette', { status: 422 })
      }
      const ingredient = await Ingredient.findOrFail(id, { client: trx })
      await this.aliases.removeFor('ingredient', id, trx)
      await ingredient.delete()
    })
  }

  private toSummary(ingredient: Ingredient): IngredientSummary {
    return {
      id: ingredient.id,
      name: ingredient.name,
      defaultUnit: ingredient.defaultUnit,
      isStaple: ingredient.isStaple,
      recipeCount: Number(ingredient.$extras.recipe_count ?? 0),
    }
  }
}
