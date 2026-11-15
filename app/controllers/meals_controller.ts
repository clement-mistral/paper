import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import {
  weekMealsValidator,
  weekMealValidator,
  weekQueryValidator,
} from '#domains/menu/validators/week'
import MealWeekView from '#views/meal_week_view'
import { fromIsoDate } from '#support/dates'
import { formatDate } from '#support/format'

/**
 * « Repas de la semaine »: plan lunches and dinners day by day, keep the
 * proposals, take a meal off. The shopping list follows (events).
 */
@inject()
export default class MealsController {
  constructor(
    private week: MealWeekView,
    private meals: MealPlanService
  ) {}

  async index({ inertia, request }: HttpContext) {
    const { semaine } = await request.validateUsing(weekQueryValidator)
    const day = semaine ? fromIsoDate(semaine) : undefined
    return inertia.render('meals/week', {
      week: await this.week.week(day?.isValid ? day : undefined),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const meal = await request.validateUsing(weekMealValidator)
    await db.transaction((trx) => this.meals.plan(meal, trx))
    session.flash('success', `Repas prévu le ${formatDate(fromIsoDate(meal.plannedOn))}`)
    return response.redirect().back()
  }

  /**
   * Keeps several proposals at once (« Tout planifier »).
   */
  async storeMany({ request, response, session }: HttpContext) {
    const { meals } = await request.validateUsing(weekMealsValidator)
    await db.transaction(async (trx) => {
      for (const meal of meals) await this.meals.plan(meal, trx)
    })
    session.flash(
      'success',
      `${meals.length} repas prévu${meals.length > 1 ? 's' : ''}, courses mises à jour`
    )
    return response.redirect().back()
  }

  async destroy({ params, response, session }: HttpContext) {
    const meal = await this.meals.cancel(Number(params.id))
    if (meal) session.flash('success', `${meal.recipe.name} retiré de la semaine`)
    return response.redirect().back()
  }
}
