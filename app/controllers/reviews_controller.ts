import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CaptureService from '#capture/capture_service'
import TaskService from '#domains/lists/services/task_service'
import RoutineService from '#domains/routine/services/routine_service'
import {
  habitValidator,
  reviewExpenseValidator,
  reviewJournalValidator,
  reviewMealValidator,
  reviewTaskValidator,
} from '#domains/routine/validators/review'
import { today, toIsoDate } from '#support/dates'
import type { Mood } from '#shared/types/routine'

/**
 * The daily review (« bilan du jour »). Every action redirects back to the
 * review page; the domain services do the work.
 */
@inject()
export default class ReviewsController {
  constructor(
    private routine: RoutineService,
    private capture: CaptureService,
    private tasks: TaskService
  ) {}

  /**
   * The review waiting now: yesterday's until noon if not done, else
   * today's.
   */
  async current({ response, auth }: HttpContext) {
    const status = await this.routine.status(auth.getUserOrFail().id)
    const day = status.due?.day ?? toIsoDate(today())
    return response.redirect().toRoute('reviews.show', { day })
  }

  async show({ inertia, params, auth }: HttpContext) {
    const day = String(params.day)
    const userId = auth.getUserOrFail().id
    const [review, streak, habits] = await Promise.all([
      this.routine.review(userId, day),
      this.routine.streak(userId),
      this.routine.habits(userId),
    ])
    return inertia.render('review', { review, streak, habits })
  }

  /**
   * An expense forgotten during the day, typed as in the palette and
   * dated on the review day.
   */
  async expense({ params, request, response, session, auth }: HttpContext) {
    const day = String(params.day)
    await this.routine.assertOpen(auth.getUserOrFail().id, day)
    const { text } = await request.validateUsing(reviewExpenseValidator)
    const receipt = await this.capture.commit({
      text,
      intent: 'expense',
      overrides: { occurredOn: day },
    })
    session.flash('capture', receipt)
    return response.redirect().back()
  }

  async confirmMoney({ params, response, auth }: HttpContext) {
    await this.routine.confirmMoney(auth.getUserOrFail().id, String(params.day))
    return response.redirect().back()
  }

  async task({ params, request, response, auth }: HttpContext) {
    const day = String(params.day)
    await this.routine.assertOpen(auth.getUserOrFail().id, day)
    const { action } = await request.validateUsing(reviewTaskValidator)
    const id = Number(params.id)
    if (action === 'done') await this.tasks.complete(id)
    else if (action === 'cancel') await this.tasks.cancel(id)
    else await this.tasks.postpone(id, action, day)
    return response.redirect().back()
  }

  async meal({ params, request, response, auth }: HttpContext) {
    const { outcome, amount } = await request.validateUsing(reviewMealValidator)
    await this.routine.mealOutcome(
      auth.getUserOrFail().id,
      String(params.day),
      Number(params.id),
      outcome,
      amount
    )
    return response.redirect().back()
  }

  async habit({ params, response, auth }: HttpContext) {
    await this.routine.toggleHabit(auth.getUserOrFail().id, String(params.day), Number(params.id))
    return response.redirect().back()
  }

  async journal({ params, request, response, auth }: HttpContext) {
    const { mood, note } = await request.validateUsing(reviewJournalValidator)
    await this.routine.journal(auth.getUserOrFail().id, String(params.day), {
      mood: (mood ?? null) as Mood | null,
      note,
    })
    return response.redirect().back()
  }

  async complete({ params, response, session, auth }: HttpContext) {
    const streak = await this.routine.complete(auth.getUserOrFail().id, String(params.day))
    session.flash(
      'success',
      streak.current > 1 ? `Journée validée · ${streak.current} jours de suite` : 'Journée validée'
    )
    return response.redirect().back()
  }

  async storeHabit({ request, response, auth }: HttpContext) {
    const { name } = await request.validateUsing(habitValidator)
    await this.routine.addHabit(auth.getUserOrFail().id, name)
    return response.redirect().back()
  }

  async archiveHabit({ params, response, auth }: HttpContext) {
    await this.routine.archiveHabit(auth.getUserOrFail().id, Number(params.id))
    return response.redirect().back()
  }
}
