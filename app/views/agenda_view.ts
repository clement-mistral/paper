import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import { urlFor } from '@adonisjs/core/services/url_builder'
import BillService from '#domains/maison/services/bill_service'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import EquipmentMaintenanceService from '#domains/maison/services/equipment_maintenance_service'
import SubscriptionService from '#domains/maison/services/subscription_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import ShoppingService from '#domains/lists/services/shopping_service'
import TaskService from '#domains/lists/services/task_service'
import { toIsoDate, today } from '#support/dates'
import { formatAmount, formatKm } from '#support/format'
import type { DueMaintenance } from '#shared/types/auto'
import type { DueEquipmentMaintenance } from '#shared/types/maison'
import type { AgendaItem, AgendaOverview, TodayOverview } from '#shared/types/agenda'
import type { TaskRow } from '#shared/types/lists'
import type { MealPlanRow } from '#shared/types/menu'

const SLOT_LABELS = { lunch: 'Midi', dinner: 'Soir' } as const
const SLOT_TIMES = { lunch: '12:00', dinner: '19:30' } as const

/**
 * Read model of « Aujourd'hui » and « Agenda »: everything with a date,
 * whatever its domain. Read only.
 */
@inject()
export default class AgendaView {
  constructor(
    private tasks: TaskService,
    private meals: MealPlanService,
    private bills: BillService,
    private subscriptions: SubscriptionService,
    private shopping: ShoppingService,
    private maintenances: MaintenanceService,
    private equipmentMaintenances: EquipmentMaintenanceService
  ) {}

  /**
   * Every dated item between two days (included), sorted by date then
   * time. Overdue open tasks and bills are not included here.
   */
  async items(start: DateTime, end: DateTime): Promise<AgendaItem[]> {
    const from = toIsoDate(start)
    const to = toIsoDate(end)
    const [tasks, meals, bills, debits, maintenances, equipmentMaintenances] = await Promise.all([
      this.tasks.between(from, to),
      this.meals.between(from, to),
      this.bills.unpaid(),
      this.subscriptions.occurrences(start, end),
      this.maintenances.planned(),
      this.equipmentMaintenances.planned(),
    ])

    const items: AgendaItem[] = [
      ...tasks.map((task) => this.task(task)),
      ...meals.map((meal) => this.meal(meal)),
      ...bills
        .filter((bill) => bill.dueOn >= from && bill.dueOn <= to)
        .map((bill) => ({
          key: `bill:${bill.id}`,
          kind: 'bill' as const,
          domain: 'maison' as const,
          title: `Facture ${bill.provider}`,
          detail: `${formatAmount(bill.amountCents)} à payer`,
          date: bill.dueOn,
          time: null,
          href: urlFor('bills.show', { id: bill.id }),
          taskId: null,
          done: false,
        })),
      ...debits.map(({ subscription, date }) => ({
        key: `subscription:${subscription.id}:${toIsoDate(date)}`,
        kind: 'subscription' as const,
        domain: 'maison' as const,
        title: `Prélèvement ${subscription.name}`,
        detail: formatAmount(subscription.priceCents),
        date: toIsoDate(date),
        time: null,
        href: urlFor('subscriptions.show', { id: subscription.id }),
        taskId: null,
        done: false,
      })),
      ...maintenances
        .filter(
          (maintenance) => maintenance.dueOn && maintenance.dueOn >= from && maintenance.dueOn <= to
        )
        .map((maintenance) => this.maintenance(maintenance, maintenance.dueOn!)),
      ...equipmentMaintenances
        .filter(
          (maintenance) => maintenance.dueOn && maintenance.dueOn >= from && maintenance.dueOn <= to
        )
        .map((maintenance) => this.equipmentMaintenance(maintenance)),
    ]

    return items.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
        a.title.localeCompare(b.title)
    )
  }

  async today(): Promise<TodayOverview> {
    const day = today()
    const yesterday = toIsoDate(day.minus({ days: 1 }))
    const [
      items,
      overdueTasks,
      bills,
      undated,
      shoppingCount,
      maintenances,
      equipmentMaintenances,
    ] = await Promise.all([
      this.items(day, day.plus({ days: 1 })),
      this.tasks.dueUntil(yesterday),
      this.bills.unpaid(),
      this.tasks.undated(),
      this.shopping.pendingCount(),
      this.maintenances.planned(),
      this.equipmentMaintenances.planned(),
    ])

    const overdue: AgendaItem[] = [
      ...overdueTasks.map((task) => this.task(task)),
      ...bills
        .filter((bill) => bill.status === 'overdue')
        .map((bill) => ({
          key: `bill:${bill.id}`,
          kind: 'bill' as const,
          domain: 'maison' as const,
          title: `Facture ${bill.provider}`,
          detail: `${formatAmount(bill.amountCents)} · échéance dépassée`,
          date: bill.dueOn,
          time: null,
          href: urlFor('bills.show', { id: bill.id }),
          taskId: null,
          done: false,
        })),
      /**
       * Overdue by date or by mileage; a mileage has no day, it shows today.
       */
      ...maintenances
        .filter((maintenance) => maintenance.status === 'overdue')
        .map((maintenance) =>
          this.maintenance(maintenance, maintenance.dueOn ?? toIsoDate(day), 'échéance dépassée')
        ),
      ...equipmentMaintenances
        .filter((maintenance) => maintenance.status === 'overdue')
        .map((maintenance) => this.equipmentMaintenance(maintenance, 'échéance dépassée')),
    ]

    return {
      overdue,
      today: items.filter((item) => item.date === toIsoDate(day)),
      tomorrow: items.filter((item) => item.date === toIsoDate(day.plus({ days: 1 }))),
      someday: undated.map((task) => this.task(task)),
      shoppingCount,
    }
  }

  async agenda(days = 14): Promise<AgendaOverview> {
    const start = today()
    const items = await this.items(start, start.plus({ days: days - 1 }))
    return {
      start: toIsoDate(start),
      days: Array.from({ length: days }, (_, index) => {
        const date = toIsoDate(start.plus({ days: index }))
        return { date, items: items.filter((item) => item.date === date) }
      }),
    }
  }

  private task(task: TaskRow): AgendaItem {
    const details = [
      task.itemCount > 0 ? `${task.itemDoneCount}/${task.itemCount}` : null,
      task.recurrence ? 'récurrente' : null,
    ].filter(Boolean)
    return {
      key: `task:${task.id}`,
      kind: 'task',
      domain: task.domain ?? 'maison',
      title: task.title,
      detail: details.length > 0 ? details.join(' · ') : null,
      date: task.dueOn ?? toIsoDate(today()),
      time: task.dueTime,
      href: urlFor('tasks.show', { id: task.id }),
      taskId: task.id,
      done: task.done,
    }
  }

  private maintenance(maintenance: DueMaintenance, date: string, note?: string): AgendaItem {
    const details = [
      maintenance.vehicleName,
      maintenance.dueOdometerKm !== null ? `à ${formatKm(maintenance.dueOdometerKm)}` : null,
      note ?? null,
    ].filter(Boolean)
    return {
      key: `maintenance:${maintenance.id}`,
      kind: 'maintenance',
      domain: 'auto',
      title: maintenance.title,
      detail: details.join(' · '),
      date,
      time: null,
      href: urlFor('maintenances.completion', { id: maintenance.id }),
      taskId: null,
      done: false,
    }
  }

  private equipmentMaintenance(maintenance: DueEquipmentMaintenance, note?: string): AgendaItem {
    return {
      key: `equipment_maintenance:${maintenance.id}`,
      kind: 'equipment_maintenance',
      domain: 'maison',
      title: maintenance.label,
      detail: [maintenance.equipmentName, note].filter(Boolean).join(' · '),
      date: maintenance.dueOn!,
      time: null,
      href: urlFor('equipment_maintenances.completion', { id: maintenance.id }),
      taskId: null,
      done: false,
    }
  }

  private meal(meal: MealPlanRow): AgendaItem {
    return {
      key: `meal:${meal.id}`,
      kind: 'meal',
      domain: 'menu',
      title: meal.recipe.name,
      detail: `${SLOT_LABELS[meal.slot]} · ${meal.servings} pers.`,
      date: meal.plannedOn,
      time: SLOT_TIMES[meal.slot],
      href: urlFor('recipes.show', { id: meal.recipe.id }),
      taskId: null,
      done: false,
    }
  }
}
