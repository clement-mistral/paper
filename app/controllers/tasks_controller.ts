import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { urlFor } from '@adonisjs/core/services/url_builder'
import TaskService from '#domains/lists/services/task_service'
import { taskFormValidator, taskItemValidator, taskValidator } from '#domains/lists/validators/task'
import type { TaskDetail } from '#shared/types/lists'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(taskValidator)
    await this.tasks.create(payload)
    return response.redirect().back()
  }

  async show({ inertia, params }: HttpContext) {
    const { sourceType, sourceId, ...task } = await this.tasks.detail(Number(params.id))
    return inertia.render('tasks/show', {
      task: { ...task, source: this.source(sourceType, sourceId) },
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(taskFormValidator)
    await this.tasks.update(Number(params.id), payload)
    session.flash('success', 'Tâche enregistrée')
    return response.redirect().back()
  }

  async toggle({ params, response, session }: HttpContext) {
    const next = await this.tasks.toggle(Number(params.id))
    if (next) session.flash('success', 'Fait. La prochaine occurrence est planifiée.')
    return response.redirect().back()
  }

  async destroy({ params, response, session }: HttpContext) {
    await this.tasks.delete(Number(params.id))
    session.flash('success', 'Tâche supprimée')
    return response.redirect().toRoute('lists')
  }

  async storeItem({ request, params, response }: HttpContext) {
    const { label } = await request.validateUsing(taskItemValidator)
    await this.tasks.addItem(Number(params.id), label)
    return response.redirect().back()
  }

  async toggleItem({ params, response }: HttpContext) {
    await this.tasks.toggleItem(Number(params.itemId))
    return response.redirect().back()
  }

  async destroyItem({ params, response }: HttpContext) {
    await this.tasks.removeItem(Number(params.itemId))
    return response.redirect().back()
  }

  /**
   * Link to the item behind an automatic task.
   */
  private source(type: string | null, id: number | null): TaskDetail['source'] {
    if (!type || !id) return null
    if (type === 'bill') return { label: 'Voir la facture', href: urlFor('bills.show', { id }) }
    if (type === 'recipe') return { label: 'Voir la recette', href: urlFor('recipes.show', { id }) }
    if (type === 'contract') {
      return { label: 'Voir le contrat', href: urlFor('contracts.show', { id }) }
    }
    return null
  }
}
