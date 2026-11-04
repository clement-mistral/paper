import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import HomeService from '#domains/maison/services/home_service'
import ProjectService from '#domains/maison/services/project_service'
import {
  projectExpenseValidator,
  projectItemValidator,
  projectValidator,
} from '#domains/maison/validators/household'
import BudgetOptionsView from '#views/budget_options_view'

/**
 * « Travaux » : projects of the home.
 */
@inject()
export default class ProjectsController {
  constructor(
    private projects: ProjectService,
    private homes: HomeService,
    private budget: BudgetOptionsView
  ) {}

  async create({ inertia, response }: HttpContext) {
    const home = await this.homes.current()
    if (!home) return response.redirect().toRoute('homes.create')
    return inertia.render('fiches/projects/form', {
      homeId: home.id,
      project: null,
      options: await this.budget.options(),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const { budget, ...payload } = await request.validateUsing(projectValidator)
    const project = await this.projects.create({ ...payload, budgetCents: budget })
    session.flash('success', `Projet « ${project.title} » créé`)
    return response.redirect().toRoute('projects.show', { id: project.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/projects/show', {
      project: await this.projects.detail(Number(params.id)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    const project = await this.projects.detail(Number(params.id))
    return inertia.render('fiches/projects/form', {
      homeId: project.homeId,
      project,
      options: await this.budget.options(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const { budget, ...payload } = await request.validateUsing(projectValidator)
    const project = await this.projects.update(Number(params.id), {
      ...payload,
      budgetCents: budget,
    })
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('projects.show', { id: project.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    const project = await this.projects.delete(Number(params.id))
    session.flash('success', 'Projet supprimé')
    return response.redirect().toRoute('homes.show', { id: project.homeId })
  }

  async storeItem({ request, response, params }: HttpContext) {
    const { label } = await request.validateUsing(projectItemValidator)
    await this.projects.addItem(Number(params.id), label)
    return response.redirect().back()
  }

  async toggleItem({ response, params }: HttpContext) {
    await this.projects.toggleItem(Number(params.itemId))
    return response.redirect().back()
  }

  async destroyItem({ response, params }: HttpContext) {
    await this.projects.removeItem(Number(params.itemId))
    return response.redirect().back()
  }

  async storeExpense({ request, response, params, session }: HttpContext) {
    const { amount, ...payload } = await request.validateUsing(projectExpenseValidator)
    await this.projects.addExpense(Number(params.id), { ...payload, amountCents: amount })
    session.flash('success', 'Dépense enregistrée')
    return response.redirect().back()
  }

  async destroyExpense({ response, params, session }: HttpContext) {
    await this.projects.removeExpense(Number(params.id), Number(params.transactionId))
    session.flash('success', 'Dépense supprimée')
    return response.redirect().back()
  }
}
