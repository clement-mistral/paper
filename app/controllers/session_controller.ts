import { inject } from '@adonisjs/core'
import User from '#models/user'
import HouseholdService from '#services/household_service'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SessionController {
  constructor(private household: HouseholdService) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', { signupOpen: await this.household.signupOpen() })
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password, remember } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user, remember === true)
    response.redirect().toRoute('today')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
