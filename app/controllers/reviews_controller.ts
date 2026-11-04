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
  async current({ response }: HttpContext) {
    const status = await this.routine.status()
    const day = status.due?.day ?? toIsoDate(today())
    return response.redirect().toRoute('reviews.show', { day })
  }

  async show({ inertia, params }: HttpContext) {
    const day = String(params.day)
    const [review, streak, habits] = await Promise.all([
      this.routine.review(day),
      this.routine.streak(),
      this.routine.habits(),
    ])
    return inertia.render('review', { review, streak, habits })
  }

  /**
   * An expense forgotten during the day, typed as in the palette and
   * dated on the review day.
   */
  async expense({ params, request, response, session }: HttpContext) {
    const day = String(params.day)
    await this.routine.assertOpen(day)
    const { text } = await request.validateUsing(reviewExpenseValidator)
    const receipt = await this.capture.commit({
      text,
      intent: 'expense',
      overrides: { occurredOn: day },
    })
    session.flash('capture', receipt)
    return response.redirect().back()
  }

  async confirmMoney({ params, response }: HttpContext) {
    await this.routine.confirmMoney(String(params.day))
    return response.redirect().back()
  }

  async task({ params, request, response }: HttpContext) {
    const day = String(params.day)
    await this.routine.assertOpen(day)
    const { action } = await request.validateUsing(reviewTaskValidator)
    const id = Number(params.id)
    if (action === 'done') await this.tasks.complete(id)
    else if (action === 'cancel') await this.tasks.cancel(id)
    else await this.tasks.postpone(id, action, day)
    return response.redirect().back()
  }

  async meal({ params, request, response }: HttpContext) {
    const { outcome, amount } = await request.validateUsing(reviewMealValidator)
    await this.routine.mealOutcome(String(params.day), Number(params.id), outcome, amount)
    return response.redirect().back()
  }

  async habit({ params, response }: HttpContext) {
    await this.routine.toggleHabit(String(params.day), Number(params.id))
    return response.redirect().back()
  }

  async journal({ params, request, response }: HttpContext) {
    const { mood, note } = await request.validateUsing(reviewJournalValidator)
    await this.routine.journal(String(params.day), { mood: (mood ?? null) as Mood | null, note })
    return response.redirect().back()
  }

  async complete({ params, response, session }: HttpContext) {
    const streak = await this.routine.complete(String(params.day))
    session.flash(
      'success',
      streak.current > 1 ? `Journée validée · ${streak.current} jours de suite` : 'Journée validée'
    )
    return response.redirect().back()
  }

  async storeHabit({ request, response }: HttpContext) {
    const { name } = await request.validateUsing(habitValidator)
    await this.routine.addHabit(name)
    return response.redirect().back()
  }

  async archiveHabit({ params, response }: HttpContext) {
    await this.routine.archiveHabit(Number(params.id))
    return response.redirect().back()
  }
}
