import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import DeadlineReminders from '#domains/notifications/services/deadline_reminders'
import PushService from '#domains/notifications/services/push_service'
import { deadlineRemindersValidator } from '#domains/notifications/validators/deadline_reminders'
import { subscribeValidator, unsubscribeValidator } from '#domains/notifications/validators/push'
import ReviewReminders from '#domains/routine/services/review_reminders'
import { remindersValidator } from '#domains/routine/validators/reminders'

/**
 * Notifications (daily review, deadlines), managed from the profile. The
 * device (un)subscriptions are JSON calls made after the browser's
 * `pushManager` answered; the rest are Inertia forms.
 */
@inject()
export default class NotificationsController {
  constructor(
    private push: PushService,
    private reminders: ReviewReminders,
    private deadlines: DeadlineReminders
  ) {}

  async subscribe({ request, response, auth }: HttpContext) {
    const input = await request.validateUsing(subscribeValidator)
    await this.push.subscribe(auth.getUserOrFail().id, input, request.header('user-agent'))
    return response.json({ ok: true })
  }

  async unsubscribe({ request, response }: HttpContext) {
    const { endpoint } = await request.validateUsing(unsubscribeValidator)
    await this.push.unsubscribe(endpoint)
    return response.json({ ok: true })
  }

  async destroyDevice({ params, response, session, auth }: HttpContext) {
    await this.push.remove(auth.getUserOrFail().id, Number(params.id))
    session.flash('success', 'Appareil retiré')
    return response.redirect().back()
  }

  async test({ response, session, auth }: HttpContext) {
    const sent = await this.reminders.test(auth.getUserOrFail().id)
    if (sent > 0) session.flash('success', 'Notification envoyée')
    else session.flash('error', 'Aucun appareil n’a reçu la notification')
    return response.redirect().back()
  }

  async updateReminders({ request, response, session, auth }: HttpContext) {
    const input = await request.validateUsing(remindersValidator)
    await this.reminders.saveSettings(auth.getUserOrFail().id, {
      eveningEnabled: input.eveningEnabled ?? false,
      eveningTime: input.eveningTime,
      morningEnabled: input.morningEnabled ?? false,
    })
    session.flash('success', 'Rappels enregistrés')
    return response.redirect().back()
  }

  async updateDeadlines({ request, response, session, auth }: HttpContext) {
    const input = await request.validateUsing(deadlineRemindersValidator)
    await this.deadlines.saveSettings(auth.getUserOrFail().id, {
      enabled: input.enabled ?? false,
      sendTime: input.sendTime,
      leadDays: input.leadDays,
      taskAlerts: input.taskAlerts ?? false,
    })
    session.flash('success', 'Rappels d’échéances enregistrés')
    return response.redirect().back()
  }
}
