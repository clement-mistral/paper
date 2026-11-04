import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import SuggestionService from '#domains/menu/services/suggestion_service'
import AgendaView from '#views/agenda_view'
import { toIsoDate, today } from '#support/dates'

@inject()
export default class TodayController {
  constructor(
    private agenda: AgendaView,
    private meals: MealPlanService,
    private suggestions: SuggestionService
  ) {}

  /**
   * « Idées pour ce soir » only when no dinner is planned today.
   */
  async index({ inertia }: HttpContext) {
    const day = toIsoDate(today())
    const [overview, meals] = await Promise.all([this.agenda.today(), this.meals.between(day, day)])
    const dinnerPlanned = meals.some((meal) => meal.slot === 'dinner')
    const dinnerIdeas = dinnerPlanned ? [] : await this.suggestions.suggest(3)
    return inertia.render('today', { overview, dinnerIdeas })
  }
}
