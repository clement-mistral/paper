import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureRef } from '#capture/intent'
import CaptureLog from '#capture/models/capture_log'
import FuelService from '#domains/auto/services/fuel_service'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import MeterService from '#domains/maison/services/meter_service'
import TransactionService from '#domains/budget/services/transaction_service'
import ShoppingService from '#domains/lists/services/shopping_service'
import TaskService from '#domains/lists/services/task_service'
import BillService from '#domains/maison/services/bill_service'
import SubscriptionService from '#domains/maison/services/subscription_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RecipeService from '#domains/menu/services/recipe_service'

/**
 * « Annuler » after a capture: removes everything it created, through the
 * public service of each domain, in one transaction.
 */
@inject()
export default class UndoService {
  constructor(
    private transactions: TransactionService,
    private meals: MealPlanService,
    private recipes: RecipeService,
    private shopping: ShoppingService,
    private subscriptions: SubscriptionService,
    private bills: BillService,
    private fuel: FuelService,
    private tasks: TaskService,
    private maintenances: MaintenanceService,
    private meters: MeterService
  ) {}

  async undo(logId: number): Promise<string> {
    return db.transaction(async (trx) => {
      const log = await CaptureLog.query({ client: trx })
        .where('id', logId)
        .forUpdate()
        .firstOrFail()
      if (log.undoneAt) throw new Exception('Cette saisie a déjà été annulée', { status: 422 })

      for (const ref of log.created) await this.remove(ref, trx)

      log.undoneAt = DateTime.now()
      await log.save()
      return `Saisie annulée : « ${log.text} »`
    })
  }

  private async remove(ref: CaptureRef, trx: TransactionClientContract) {
    switch (ref.type) {
      case 'transaction':
        return this.transactions.delete(ref.id, trx)
      case 'meal_plan':
        await this.shopping.removeForSource('meal_plan', ref.id, trx)
        return this.meals.delete(ref.id, trx)
      case 'recipe':
        return this.recipes.undoDraft(ref.id, trx)
      case 'shopping_item':
        return this.shopping.removeMany([ref.id], trx)
      case 'subscription':
        return this.subscriptions.undo(ref.id, trx)
      case 'bill':
        return this.bills.undo(ref.id, trx)
      case 'fuel_log':
        return this.fuel.undo(ref.id, trx)
      case 'task':
        return this.tasks.delete(ref.id, trx)
      case 'transfer':
        return this.transactions.deleteTransfer(ref.id, trx)
      case 'maintenance':
        return this.maintenances.undoCreated(ref.id, trx)
      case 'maintenance_completion':
        return this.maintenances.undoCompletion(ref.id, trx)
      case 'meter_reading':
        return this.meters.deleteReading(ref.id, trx)
    }
  }
}
