import { inject } from '@adonisjs/core'
import User from '#models/user'
import HouseholdService from '#services/household_service'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Self-signup creates the household: only possible while no account
 * exists. Everyone else joins through an invitation link.
 */
@inject()
export default class NewAccountController {
  constructor(private household: HouseholdService) {}

  async create({ inertia, response, session }: HttpContext) {
    if (!(await this.household.signupOpen())) return this.closed(response, session)
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth, session }: HttpContext) {
    if (!(await this.household.signupOpen())) return this.closed(response, session)
    const { fullName, email, password } = await request.validateUsing(signupValidator)
    const user = await User.create({ fullName, email, password })

    await auth.use('web').login(user)
    response.redirect().toRoute('today')
  }

  private closed(response: HttpContext['response'], session: HttpContext['session']) {
    session.flash('error', 'Pour rejoindre le foyer, demandez un lien d’invitation à un membre')
    return response.redirect().toRoute('session.create')
  }
}
