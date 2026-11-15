import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SearchView from '#views/search_view'
import { searchValidator } from '#validators/search'

/**
 * Global search of the Ctrl K palette, called with `fetch` while the user
 * types (not an Inertia visit).
 */
@inject()
export default class SearchController {
  constructor(private search: SearchView) {}

  async index({ request, response }: HttpContext) {
    const { q } = await request.validateUsing(searchValidator)
    return response.json(await this.search.search(q))
  }
}
