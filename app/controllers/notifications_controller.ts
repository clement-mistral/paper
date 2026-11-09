import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PushService from '#domains/notifications/services/push_service'
import { subscribeValidator, unsubscribeValidator } from '#domains/notifications/validators/push'
import ReviewReminders from '#domains/routine/services/review_reminders'
import { remindersValidator } from '#domains/routine/validators/reminders'

/**
 * Notifications of the daily review, managed from the profile. The
 * device (un)subscriptions are JSON calls made after the browser's
 * `pushManager` answered; the rest are Inertia forms.
 */
@inject()
export default class NotificationsController {
  constructor(
    private push: PushService,
    private reminders: ReviewReminders
  ) {}

  async subscribe({ request, response }: HttpContext) {
    const input = await request.validateUsing(subscribeValidator)
    await this.push.subscribe(input, request.header('user-agent'))
    return response.json({ ok: true })
  }

  async unsubscribe({ request, response }: HttpContext) {
    const { endpoint } = await request.validateUsing(unsubscribeValidator)
    await this.push.unsubscribe(endpoint)
    return response.json({ ok: true })
  }

  async destroyDevice({ params, response, session }: HttpContext) {
    await this.push.remove(Number(params.id))
    session.flash('success', 'Appareil retiré')
    return response.redirect().back()
  }

  async test({ response, session }: HttpContext) {
    const sent = await this.reminders.test()
    if (sent > 0) session.flash('success', 'Notification envoyée')
    else session.flash('error', 'Aucun appareil n’a reçu la notification')
    return response.redirect().back()
  }

  async updateReminders({ request, response, session }: HttpContext) {
    const input = await request.validateUsing(remindersValidator)
    await this.reminders.saveSettings({
      eveningEnabled: input.eveningEnabled ?? false,
      eveningTime: input.eveningTime,
      morningEnabled: input.morningEnabled ?? false,
    })
    session.flash('success', 'Rappels enregistrés')
    return response.redirect().back()
  }
}
