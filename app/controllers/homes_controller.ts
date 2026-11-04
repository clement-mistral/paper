import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import HomeService from '#domains/maison/services/home_service'
import TaskService from '#domains/lists/services/task_service'
import { CHORE_SUGGESTIONS } from '#domains/maison/chore_suggestions'
import type { ChoreRow } from '#shared/types/maison'
import { homeValidator } from '#domains/maison/validators/home'

/**
 * « Logement » : the single home of the household. The fiche opens
 * directly, or its creation form the first time.
 */
@inject()
export default class HomesController {
  constructor(
    private homes: HomeService,
    private tasks: TaskService
  ) {}

  async index({ response }: HttpContext) {
    const home = await this.homes.current()
    return home
      ? response.redirect().toRoute('homes.show', { id: home.id })
      : response.redirect().toRoute('homes.create')
  }

  async create({ inertia, response }: HttpContext) {
    const home = await this.homes.current()
    if (home) return response.redirect().toRoute('homes.show', { id: home.id })
    return inertia.render('fiches/homes/form', { home: null })
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(homeValidator)
    const existing = await this.homes.current()
    if (existing) return response.redirect().toRoute('homes.show', { id: existing.id })

    const home = await this.homes.create(payload)
    session.flash('success', 'Logement créé')
    return response.redirect().toRoute('homes.show', { id: home.id })
  }

  async show({ inertia, params }: HttpContext) {
    const [home, tasks] = await Promise.all([
      this.homes.detail(Number(params.id)),
      this.tasks.chores(),
    ])
    const chores: ChoreRow[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      room: task.room,
      recurrence: task.recurrence,
      recurrenceInterval: task.recurrenceInterval,
      dueOn: task.dueOn,
      overdue: task.overdue,
      lastDoneOn: task.lastDoneOn,
    }))
    const titles = new Set(chores.map((chore) => chore.title))
    return inertia.render('fiches/homes/show', {
      home,
      chores,
      choreSuggestions: CHORE_SUGGESTIONS.filter((suggestion) => !titles.has(suggestion.title)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/homes/form', {
      home: await this.homes.detail(Number(params.id)),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const home = await this.homes.update(
      Number(params.id),
      await request.validateUsing(homeValidator)
    )
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('homes.show', { id: home.id })
  }
}
