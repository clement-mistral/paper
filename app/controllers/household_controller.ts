import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { urlFor } from '@adonisjs/core/services/url_builder'
import HouseholdService from '#services/household_service'

/**
 * « Foyer », in the profile: invite someone, withdraw an invitation,
 * remove a member.
 */
@inject()
export default class HouseholdController {
  constructor(private household: HouseholdService) {}

  /**
   * The link is shown once, in the flash: only its hash is kept.
   */
  async invite({ auth, request, response, session }: HttpContext) {
    const { token } = await this.household.invite(auth.getUserOrFail().id)
    const link = new URL(urlFor('invitations.show', { token }), request.completeUrl()).toString()
    session.flash('invitation', link)
    return response.redirect().back()
  }

  async revoke({ params, response, session }: HttpContext) {
    await this.household.revoke(Number(params.id))
    session.flash('success', 'Invitation retirée')
    return response.redirect().back()
  }

  async remove({ auth, params, response, session }: HttpContext) {
    const name = await this.household.remove(Number(params.id), auth.getUserOrFail().id)
    session.flash('success', `${name} ne fait plus partie du foyer`)
    return response.redirect().back()
  }
}
