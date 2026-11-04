import type { HttpContext } from '@adonisjs/core/http'

/**
 * Index of the fiche types; each type has its own controller.
 */
export default class FichesController {
  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/index', {})
  }
}
