import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import TaskService from '#domains/lists/services/task_service'
import { CHORE_SUGGESTIONS } from '#domains/maison/chore_suggestions'
import { choreSuggestionValidator, choreValidator } from '#domains/maison/validators/household'
import { toIsoDate, today } from '#support/dates'

/**
 * « Ménage » : household chores are recurring Maison tasks with a room.
 * They live in the Lists module, so they also show in « À faire »,
 * « Aujourd'hui » and the daily review.
 */
@inject()
export default class ChoresController {
  constructor(private tasks: TaskService) {}

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(choreValidator)
    await this.tasks.create({
      title: payload.title,
      room: payload.room,
      recurrence: payload.recurrence,
      recurrenceInterval: payload.recurrenceInterval ?? 1,
      dueOn: payload.dueOn ?? toIsoDate(today()),
      domain: 'maison',
      isChore: true,
    })
    session.flash('success', 'Tâche ménagère ajoutée')
    return response.redirect().back()
  }

  async suggest({ request, response, session }: HttpContext) {
    const { key } = await request.validateUsing(choreSuggestionValidator)
    const suggestion = CHORE_SUGGESTIONS.find((item) => item.key === key)
    if (!suggestion) return response.notFound()
    await this.tasks.create({
      title: suggestion.title,
      room: suggestion.room,
      recurrence: suggestion.recurrence,
      recurrenceInterval: suggestion.recurrenceInterval,
      dueOn: toIsoDate(today()),
      domain: 'maison',
      isChore: true,
    })
    session.flash('success', `« ${suggestion.title} » ajouté au ménage`)
    return response.redirect().back()
  }
}
