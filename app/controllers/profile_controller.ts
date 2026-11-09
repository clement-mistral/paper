import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { errors } from '@vinejs/vine'
import User from '#models/user'
import { passwordValidator, profileValidator } from '#validators/user'
import PushService from '#domains/notifications/services/push_service'
import ReviewReminders from '#domains/routine/services/review_reminders'
import type { NotificationsPanel } from '#shared/types/notifications'

/**
 * « Profil » : the user's own information, password and notifications.
 */
@inject()
export default class ProfileController {
  constructor(
    private push: PushService,
    private reminders: ReviewReminders
  ) {}

  async show({ inertia }: HttpContext) {
    const [devices, reminders] = await Promise.all([this.push.devices(), this.reminders.settings()])
    const notifications: NotificationsPanel = {
      configured: this.push.configured,
      publicKey: this.push.publicKey(),
      devices,
      reminders,
    }
    return inertia.render('profile', { notifications })
  }

  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { fullName, email } = await request.validateUsing(profileValidator, {
      meta: { userId: user.id },
    })

    user.merge({ fullName: fullName || null, email })
    await user.save()

    session.flash('success', 'Profil mis à jour')
    return response.redirect().toRoute('profile.show')
  }

  async updatePassword({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(passwordValidator)

    if (!(await hash.verify(user.password, currentPassword))) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'currentPassword',
          message: 'Le mot de passe actuel est incorrect',
          rule: 'current_password',
        },
      ])
    }

    user.password = password
    await user.save()

    /**
     * A new password signs out the other devices remembered with the old
     * one, then logs this one in again (keeping « Se souvenir de moi » if
     * it was in use).
     */
    const guard = auth.use('web')
    const remembered = Boolean(request.encryptedCookie(guard.rememberMeKeyName))
    const tokens = await User.rememberMeTokens.all(user)
    await Promise.all(tokens.map((token) => User.rememberMeTokens.delete(user, token.identifier)))
    await guard.login(user, remembered)

    session.flash('success', 'Mot de passe modifié')
    return response.redirect().toRoute('profile.show')
  }
}
