import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ProjectService from '#domains/projects/services/project_service'
import {
  projectCreateValidator,
  projectExpenseValidator,
  projectLinkValidator,
  projectNoteValidator,
  projectTaskValidator,
  projectUpdateValidator,
} from '#domains/projects/validators/project'
import { toIsoDate, today } from '#support/dates'

/**
 * « Projets »: personal projects (notes, tasks, links, budget), private
 * unless shared with the household. Every action is checked against the
 * signed-in person by the service.
 */
@inject()
export default class PersonalProjectsController {
  constructor(private projects: ProjectService) {}

  async index({ inertia, auth }: HttpContext) {
    return inertia.render('projects/index', {
      projects: await this.projects.list(auth.getUserOrFail().id),
    })
  }

  async store({ request, response, auth }: HttpContext) {
    const { title } = await request.validateUsing(projectCreateValidator)
    const project = await this.projects.create(auth.getUserOrFail().id, title)
    return response.redirect().toRoute('personal_projects.show', { id: project.id })
  }

  async show({ inertia, params, auth }: HttpContext) {
    return inertia.render('projects/show', {
      project: await this.projects.detail(auth.getUserOrFail().id, Number(params.id)),
      today: toIsoDate(today()),
    })
  }

  async update({ request, response, params, auth, session }: HttpContext) {
    const { budget, sharing, shared, ...input } =
      await request.validateUsing(projectUpdateValidator)
    await this.projects.update(auth.getUserOrFail().id, Number(params.id), {
      ...input,
      shared: sharing ? (shared ?? false) : undefined,
      budgetCents: budget === null || budget === undefined ? null : Math.round(budget * 100),
    })
    session.flash('success', 'Projet enregistré')
    return response.redirect().back()
  }

  async destroy({ response, params, auth, session }: HttpContext) {
    const title = await this.projects.delete(auth.getUserOrFail().id, Number(params.id))
    session.flash('success', `Projet « ${title} » supprimé`)
    return response.redirect().toRoute('personal_projects.index')
  }

  async storeNote({ request, response, params, auth }: HttpContext) {
    const { body } = await request.validateUsing(projectNoteValidator)
    await this.projects.addNote(auth.getUserOrFail().id, Number(params.id), body)
    return response.redirect().back()
  }

  async updateNote({ request, response, params, auth }: HttpContext) {
    const { body } = await request.validateUsing(projectNoteValidator)
    await this.projects.updateNote(
      auth.getUserOrFail().id,
      Number(params.id),
      Number(params.itemId),
      body
    )
    return response.redirect().back()
  }

  async destroyNote({ response, params, auth }: HttpContext) {
    await this.projects.deleteNote(
      auth.getUserOrFail().id,
      Number(params.id),
      Number(params.itemId)
    )
    return response.redirect().back()
  }

  async storeTask({ request, response, params, auth }: HttpContext) {
    const { title } = await request.validateUsing(projectTaskValidator)
    await this.projects.addTask(auth.getUserOrFail().id, Number(params.id), title)
    return response.redirect().back()
  }

  async toggleTask({ response, params, auth }: HttpContext) {
    await this.projects.toggleTask(
      auth.getUserOrFail().id,
      Number(params.id),
      Number(params.itemId)
    )
    return response.redirect().back()
  }

  async destroyTask({ response, params, auth }: HttpContext) {
    await this.projects.deleteTask(
      auth.getUserOrFail().id,
      Number(params.id),
      Number(params.itemId)
    )
    return response.redirect().back()
  }

  async storeLink({ request, response, params, auth }: HttpContext) {
    const { url, title } = await request.validateUsing(projectLinkValidator)
    await this.projects.addLink(auth.getUserOrFail().id, Number(params.id), url, title ?? null)
    return response.redirect().back()
  }

  async destroyLink({ response, params, auth }: HttpContext) {
    await this.projects.deleteLink(
      auth.getUserOrFail().id,
      Number(params.id),
      Number(params.itemId)
    )
    return response.redirect().back()
  }

  async storeExpense({ request, response, params, auth, session }: HttpContext) {
    const { amount, label, occurredOn } = await request.validateUsing(projectExpenseValidator)
    await this.projects.addExpense(auth.getUserOrFail().id, Number(params.id), {
      amountCents: Math.round(amount * 100),
      label,
      occurredOn,
    })
    session.flash('success', 'Dépense ajoutée au projet et à Argent')
    return response.redirect().back()
  }

  async destroyExpense({ response, params, auth }: HttpContext) {
    await this.projects.deleteExpense(
      auth.getUserOrFail().id,
      Number(params.id),
      Number(params.itemId)
    )
    return response.redirect().back()
  }
}
