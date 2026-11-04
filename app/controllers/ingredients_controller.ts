import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import IngredientService from '#domains/menu/services/ingredient_service'
import { ingredientValidator } from '#domains/menu/validators/ingredient'
import { substitutionValidator } from '#domains/menu/validators/pantry'

/**
 * Ingredients are created on the fly from recipes; this fiche only edits
 * them (unit, staple, synonyms).
 */
@inject()
export default class IngredientsController {
  constructor(private ingredients: IngredientService) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/ingredients/index', {
      ingredients: await this.ingredients.list(),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/ingredients/form', {
      ingredient: await this.ingredients.detail(Number(params.id)),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(ingredientValidator)
    await this.ingredients.update(Number(params.id), payload)
    session.flash('success', 'Ingrédient enregistré')
    return response.redirect().toRoute('ingredients.index')
  }

  async storeSubstitution({ request, response, params, session }: HttpContext) {
    const { name, note } = await request.validateUsing(substitutionValidator)
    await this.ingredients.addSubstitution(Number(params.id), name, note)
    session.flash('success', `${name} ajouté comme remplacement`)
    return response.redirect().back()
  }

  async destroySubstitution({ response, params }: HttpContext) {
    await this.ingredients.removeSubstitution(Number(params.substitutionId))
    return response.redirect().back()
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.ingredients.delete(Number(params.id))
    session.flash('success', 'Ingrédient supprimé')
    return response.redirect().toRoute('ingredients.index')
  }
}
