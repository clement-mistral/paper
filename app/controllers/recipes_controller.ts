import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import IngredientService from '#domains/menu/services/ingredient_service'
import db from '@adonisjs/lucid/services/db'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RecipeService from '#domains/menu/services/recipe_service'
import SuggestionService from '#domains/menu/services/suggestion_service'
import { importRecipe } from '#domains/menu/services/recipe_import'
import { SAFE_FETCH_CODE } from '#support/safe_fetch'
import { recipeValidator } from '#domains/menu/validators/recipe'
import { planSuggestionValidator, recipeImportValidator } from '#domains/menu/validators/pantry'
import { formatDate } from '#support/format'
import { fromIsoDate } from '#support/dates'
import { errors } from '@vinejs/vine'
import { Exception } from '@adonisjs/core/exceptions'

@inject()
export default class RecipesController {
  constructor(
    private recipes: RecipeService,
    private ingredients: IngredientService,
    private suggestions: SuggestionService,
    private meals: MealPlanService
  ) {}

  /**
   * Known ingredient names, suggested while typing in the recipe form.
   */
  private async ingredientNames() {
    const ingredients = await this.ingredients.list()
    return ingredients.map(({ name }) => name)
  }

  async index({ inertia }: HttpContext) {
    const [recipes, suggestions] = await Promise.all([
      this.recipes.list(),
      this.suggestions.suggest(5),
    ])
    return inertia.render('fiches/recipes/index', { recipes, suggestions })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/recipes/form', {
      recipe: null,
      imported: null,
      ingredientNames: await this.ingredientNames(),
    })
  }

  async importForm({ inertia }: HttpContext) {
    return inertia.render('fiches/recipes/import', {})
  }

  /**
   * Reads a recipe page and opens the recipe form prefilled: the user
   * reviews how ingredients were matched to the catalogue, then saves.
   */
  async import({ request, inertia }: HttpContext) {
    const { url } = await request.validateUsing(recipeImportValidator)
    let imported
    try {
      imported = await importRecipe(url)
    } catch (error) {
      if (error instanceof Exception && error.code === SAFE_FETCH_CODE) {
        throw new errors.E_VALIDATION_ERROR([
          { field: 'url', message: error.message, rule: 'recipe_import' },
        ])
      }
      throw error
    }
    const ingredients = await Promise.all(
      imported.ingredients.map(async (row) => {
        const known = await this.ingredients.match(row.name)
        return { ...row, name: known?.name ?? row.name, known: known !== null }
      })
    )
    return inertia.render('fiches/recipes/form', {
      recipe: null,
      imported: { ...imported, ingredients },
      ingredientNames: await this.ingredientNames(),
    })
  }

  /**
   * « Ce soir » on a suggestion: plans the recipe.
   */
  async plan({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(planSuggestionValidator)
    const recipe = await this.recipes.detail(Number(params.id))
    await db.transaction((trx) => this.meals.plan({ ...payload, recipeId: recipe.id }, trx))
    session.flash(
      'success',
      `${recipe.name} prévu le ${formatDate(fromIsoDate(payload.plannedOn))}, courses mises à jour`
    )
    return response.redirect().back()
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(recipeValidator)
    const recipe = await this.recipes.create(payload)
    session.flash('success', `Recette « ${recipe.name} » créée`)
    return response.redirect().toRoute('recipes.show', { id: recipe.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/recipes/show', {
      recipe: await this.recipes.detail(Number(params.id)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/recipes/form', {
      recipe: await this.recipes.detail(Number(params.id)),
      imported: null,
      ingredientNames: await this.ingredientNames(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(recipeValidator)
    const recipe = await this.recipes.update(Number(params.id), payload)
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('recipes.show', { id: recipe.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.recipes.delete(Number(params.id))
    session.flash('success', 'Recette supprimée')
    return response.redirect().toRoute('recipes.index')
  }
}
