import { inject } from '@adonisjs/core'
import AutomaticTasks from '#domains/lists/services/automatic_tasks'

/**
 * A bill or a recipe changed: reconcile the automatic tasks. Idempotent.
 */
@inject()
export default class SyncAutomaticTasks {
  constructor(private tasks: AutomaticTasks) {}

  async handle() {
    await this.tasks.sync()
  }
}
