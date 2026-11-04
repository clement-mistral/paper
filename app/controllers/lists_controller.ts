import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ShoppingService from '#domains/lists/services/shopping_service'
import TaskService from '#domains/lists/services/task_service'
import PantryService from '#domains/menu/services/pantry_service'
import { shoppingItemValidator } from '#domains/lists/validators/shopping'

@inject()
export default class ListsController {
  constructor(
    private shopping: ShoppingService,
    private tasks: TaskService,
    private pantry: PantryService
  ) {}

  async index({ inertia }: HttpContext) {
    const [shopping, tasks, pantry] = await Promise.all([
      this.shopping.list(),
      this.tasks.list(),
      this.pantry.list(),
    ])
    return inertia.render('lists', { shopping, tasks, pantry })
  }

  async store({ request, response }: HttpContext) {
    const { label } = await request.validateUsing(shoppingItemValidator)
    await db.transaction((trx) => this.shopping.add([{ label }], trx))
    return response.redirect().back()
  }

  async toggle({ params, response }: HttpContext) {
    await this.shopping.toggle(Number(params.id))
    return response.redirect().back()
  }

  async destroy({ params, response }: HttpContext) {
    await this.shopping.remove(Number(params.id))
    return response.redirect().back()
  }

  async clearChecked({ response }: HttpContext) {
    await this.shopping.clearChecked()
    return response.redirect().back()
  }
}
