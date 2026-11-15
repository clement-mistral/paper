import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import SuggestionService from '#domains/menu/services/suggestion_service'
import AgendaView from '#views/agenda_view'
import MoneyView from '#views/money_view'
import { toIsoDate, today } from '#support/dates'

@inject()
export default class TodayController {
  constructor(
    private agenda: AgendaView,
    private meals: MealPlanService,
    private suggestions: SuggestionService,
    private money: MoneyView
  ) {}

  /**
   * « Idées pour ce soir » only when no dinner is planned today.
   */
  async index({ inertia }: HttpContext) {
    const day = toIsoDate(today())
    const [overview, meals, money] = await Promise.all([
      this.agenda.today(),
      this.meals.between(day, day),
      this.money.overview(),
    ])
    const dinnerPlanned = meals.some((meal) => meal.slot === 'dinner')
    const dinnerIdeas = dinnerPlanned ? [] : await this.suggestions.suggest(3)
    /** The month's budget at a glance, when there is one. */
    const budgetLeftCents =
      money.budgetedThisMonthCents > 0
        ? money.budgetedThisMonthCents - money.spentThisMonthCents
        : null
    return inertia.render('today', { overview, dinnerIdeas, budgetLeftCents })
  }
}
