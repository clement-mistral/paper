import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import HouseholdService, { displayName } from '#services/household_service'
import { invitationValidator } from '#validators/user'

/**
 * Joining the household from an invitation link (signed out).
 */
@inject()
export default class InvitationsController {
  constructor(private household: HouseholdService) {}

  async show({ inertia, params }: HttpContext) {
    const invitation = await this.household.findValid(String(params.token))
    return inertia.render('auth/invitation', {
      token: String(params.token),
      invitedBy: invitation ? displayName(invitation.createdBy) : null,
    })
  }

  async accept({ request, response, auth, params }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(invitationValidator)
    const user = await this.household.accept(String(params.token), { fullName, email, password })
    await auth.use('web').login(user)
    return response.redirect().toRoute('today')
  }
}
