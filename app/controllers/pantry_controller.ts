import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PantryService from '#domains/menu/services/pantry_service'
import { pantryUpdateValidator, pantryValidator } from '#domains/menu/validators/pantry'

/**
 * « Placards » in Listes: the stock of the Menu domain, typed by hand.
 */
@inject()
export default class PantryController {
  constructor(private pantry: PantryService) {}

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(pantryValidator)
    await this.pantry.add(payload)
    session.flash('success', `${payload.name} ajouté au stock`)
    return response.redirect().back()
  }

  /**
   * An empty quantity means « il y en a », zero removes the item.
   */
  async update({ request, response, params }: HttpContext) {
    const payload = await request.validateUsing(pantryUpdateValidator)
    await this.pantry.update(Number(params.id), {
      ...payload,
      quantity: payload.quantity ?? null,
    })
    return response.redirect().back()
  }

  async destroy({ response, params }: HttpContext) {
    await this.pantry.remove(Number(params.id))
    return response.redirect().back()
  }
}
