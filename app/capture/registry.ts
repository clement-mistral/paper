import app from '@adonisjs/core/services/app'
import type { CaptureIntent } from '#capture/intent'
import BillIntent from '#capture/intents/bill_intent'
import ExpenseIntent from '#capture/intents/expense_intent'
import FuelIntent from '#capture/intents/fuel_intent'
import IncomeIntent from '#capture/intents/income_intent'
import MaintenanceIntent from '#capture/intents/maintenance_intent'
import MeterReadingIntent from '#capture/intents/meter_reading_intent'
import ProjectExpenseIntent from '#capture/intents/project_expense_intent'
import MealIntent from '#capture/intents/meal_intent'
import ShoppingItemIntent from '#capture/intents/shopping_item_intent'
import SubscriptionIntent from '#capture/intents/subscription_intent'
import TaskIntent from '#capture/intents/task_intent'
import TransferIntent from '#capture/intents/transfer_intent'

/**
 * Every intent known to the universal capture. Register new ones here.
 */
const INTENTS = [
  ExpenseIntent,
  MealIntent,
  ShoppingItemIntent,
  SubscriptionIntent,
  BillIntent,
  FuelIntent,
  TaskIntent,
  IncomeIntent,
  TransferIntent,
  MaintenanceIntent,
  MeterReadingIntent,
  ProjectExpenseIntent,
]

export async function loadIntents(): Promise<CaptureIntent[]> {
  return Promise.all(INTENTS.map((intent) => app.container.make(intent)))
}
