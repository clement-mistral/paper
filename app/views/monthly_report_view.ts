import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import BillService from '#domains/maison/services/bill_service'
import ContractService from '#domains/maison/services/contract_service'
import EquipmentMaintenanceService from '#domains/maison/services/equipment_maintenance_service'
import SubscriptionService from '#domains/maison/services/subscription_service'
import { consumptionBetween } from '#domains/maison/services/meter_service'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import { streaks } from '#domains/routine/services/review_window'
import MoneyView from '#views/money_view'
import { NOT_TRANSFER_SQL } from '#domains/budget/services/transaction_service'
import { HOME_ZONE, toIsoDate, today } from '#support/dates'
import { formatAmount, formatKm } from '#support/format'
import { CLAIM_STATUS_LABELS, METER_UNITS, PROJECT_STATUS_LABELS } from '#shared/types/maison'
import type { ClaimStatus, MeterKind, ProjectStatus } from '#shared/types/maison'
import type { Domain } from '#shared/types/domain'
import type { MonthlyReport } from '#shared/types/report'

type Range = { start: string; end: string; next: string }

const num = (value: unknown) => Number(value ?? 0)

/**
 * Read model of « Compte rendu du mois »: what the household spent, did,
 * consumed and has coming, across every domain, for one calendar month.
 * Read only.
 */
@inject()
export default class MonthlyReportView {
  constructor(
    private money: MoneyView,
    private vehicles: VehicleService,
    private maintenances: MaintenanceService,
    private equipmentMaintenances: EquipmentMaintenanceService,
    private bills: BillService,
    private subscriptions: SubscriptionService,
    private contracts: ContractService
  ) {}

  async report(month: string, householdName: string | null): Promise<MonthlyReport> {
    const first = DateTime.fromISO(`${month}-01`, { zone: HOME_ZONE }).startOf('day')
    const range: Range = {
      start: toIsoDate(first),
      end: toIsoDate(first.endOf('month')),
      next: toIsoDate(first.plus({ months: 1 })),
    }

    const [money, maison, auto, menu, routine, upcoming] = await Promise.all([
      this.moneySection(first, range),
      this.maisonSection(range),
      this.autoSection(range),
      this.menuSection(range),
      this.routineSection(first, range),
      this.upcomingSection(first.plus({ months: 1 })),
    ])

    return {
      month,
      previousMonth: first.minus({ months: 1 }).toFormat('yyyy-LL'),
      nextMonth: first.plus({ months: 1 }).toFormat('yyyy-LL'),
      complete: first.plus({ months: 1 }) <= today(),
      generatedOn: toIsoDate(today()),
      householdName,
      money,
      maison,
      auto,
      menu,
      routine,
      upcoming,
    }
  }

  private async moneySection(first: DateTime, range: Range): Promise<MonthlyReport['money']> {
    const inMonth = () =>
      db
        .from('transactions')
        .whereBetween('transactions.occurred_on', [range.start, range.end])
        .whereRaw(NOT_TRANSFER_SQL)
    const previousStart = toIsoDate(first.minus({ months: 1 }))
    const previousEnd = toIsoDate(first.minus({ days: 1 }))

    const [totals, previous, byDomain, byEnvelope, top, worth, trend] = await Promise.all([
      inMonth()
        .select(
          db.raw('coalesce(-sum(amount_cents) filter (where amount_cents < 0), 0)::int as spent')
        )
        .select(
          db.raw('coalesce(sum(amount_cents) filter (where amount_cents > 0), 0)::int as income')
        )
        .firstOrFail(),
      db
        .from('transactions')
        .whereBetween('occurred_on', [previousStart, previousEnd])
        .where('amount_cents', '<', 0)
        .whereRaw(NOT_TRANSFER_SQL)
        .select(db.raw('coalesce(-sum(amount_cents), 0)::int as spent'))
        .firstOrFail(),
      inMonth()
        .where('amount_cents', '<', 0)
        .select('domain')
        .select(db.raw('-sum(amount_cents)::int as cents'))
        .groupBy('domain')
        .orderBy('cents', 'desc'),
      db
        .from('envelopes')
        .leftJoin('transactions', (join) => {
          join
            .on('transactions.envelope_id', 'envelopes.id')
            .andOnVal('transactions.amount_cents', '<', 0)
            .andOnVal('transactions.occurred_on', '>=', range.start)
            .andOnVal('transactions.occurred_on', '<=', range.end)
        })
        .select('envelopes.name', 'envelopes.monthly_budget_cents')
        .select(db.raw('coalesce(-sum(transactions.amount_cents), 0)::int as spent'))
        .groupBy('envelopes.id', 'envelopes.name', 'envelopes.monthly_budget_cents')
        .orderBy('spent', 'desc'),
      inMonth()
        .where('amount_cents', '<', 0)
        .select('label', 'occurred_on', 'amount_cents', 'domain')
        .orderBy('amount_cents', 'asc')
        .limit(5),
      db
        .from('accounts')
        .select(
          db.raw(
            `(coalesce(sum(opening_balance_cents), 0) + coalesce((select sum(t.amount_cents) from transactions t where t.account_id is not null and t.occurred_on <= ?), 0))::int as worth`,
            [range.end]
          )
        )
        .firstOrFail(),
      this.money.monthlySpending({}, 6, first),
    ])

    const envelopes = byEnvelope as Array<{
      name: string
      monthly_budget_cents: number
      spent: number
    }>
    return {
      spentCents: num(totals.spent),
      previousSpentCents: num(previous.spent),
      incomeCents: num(totals.income),
      budgetedCents: envelopes.reduce((total, row) => total + num(row.monthly_budget_cents), 0),
      netWorthCents: num(worth.worth),
      byDomain: (byDomain as Array<{ domain: Domain; cents: number }>).map((row) => ({
        domain: row.domain,
        cents: num(row.cents),
      })),
      byEnvelope: envelopes
        .filter((row) => num(row.spent) > 0 || num(row.monthly_budget_cents) > 0)
        .map((row) => ({
          name: row.name,
          spentCents: num(row.spent),
          budgetCents: num(row.monthly_budget_cents),
        })),
      topExpenses: (
        top as Array<{ label: string; occurred_on: string; amount_cents: number; domain: Domain }>
      ).map((row) => ({
        label: row.label,
        occurredOn: row.occurred_on,
        cents: Math.abs(num(row.amount_cents)),
        domain: row.domain,
      })),
      trend,
    }
  }

  private async maisonSection(range: Range): Promise<MonthlyReport['maison']> {
    const [bills, subscriptions, maintenances, projects, claims, meters, readings, chores] =
      await Promise.all([
        db
          .from('bills')
          .whereBetween('paid_on', [range.start, range.end])
          .select(
            db.raw('count(*)::int as count'),
            db.raw('coalesce(sum(amount_cents), 0)::int as cents')
          )
          .firstOrFail(),
        db
          .from('transactions')
          .where('source_type', 'subscription')
          .whereBetween('occurred_on', [range.start, range.end])
          .select(db.raw('coalesce(-sum(amount_cents), 0)::int as cents'))
          .firstOrFail(),
        db
          .from('equipment_maintenances')
          .join('equipment', 'equipment.id', 'equipment_maintenances.equipment_id')
          .whereBetween('equipment_maintenances.done_on', [range.start, range.end])
          .select(
            'equipment_maintenances.label',
            'equipment_maintenances.done_on',
            'equipment_maintenances.cost_cents',
            'equipment.name as equipment'
          )
          .orderBy('equipment_maintenances.done_on'),
        db
          .from('projects')
          .leftJoin('transactions', (join) => {
            join
              .on('transactions.source_id', 'projects.id')
              .andOnVal('transactions.source_type', '=', 'project')
              .andOnVal('transactions.occurred_on', '>=', range.start)
              .andOnVal('transactions.occurred_on', '<=', range.end)
          })
          .where((query) =>
            query
              .whereIn('projects.status', ['in_progress', 'planned'])
              .orWhereBetween('projects.done_on', [range.start, range.end])
              .orWhereNotNull('transactions.id')
          )
          .select('projects.title', 'projects.status')
          .select(db.raw('coalesce(-sum(transactions.amount_cents), 0)::int as spent'))
          .groupBy('projects.id', 'projects.title', 'projects.status')
          .orderBy('spent', 'desc'),
        db
          .from('claims')
          .where((query) =>
            query
              .whereIn('status', ['to_declare', 'declared', 'assessment'])
              .orWhereBetween('occurred_on', [range.start, range.end])
              .orWhereBetween('compensated_on', [range.start, range.end])
          )
          .select('title', 'status', 'occurred_on')
          .orderBy('occurred_on', 'desc'),
        db.from('meters').select('id', 'label', 'kind').orderBy('kind'),
        db.from('meter_readings').select('meter_id', 'read_on', 'value'),
        db
          .from('tasks')
          .where('is_chore', true)
          .select(
            db.raw('count(*) filter (where done_at >= ? and done_at < ?)::int as done', [
              range.start,
              range.next,
            ]),
            db.raw('count(*) filter (where done_at is null and cancelled_at is null)::int as open'),
            db.raw(
              'count(*) filter (where done_at is null and cancelled_at is null and due_on < ?)::int as overdue',
              [toIsoDate(today())]
            )
          )
          .firstOrFail(),
      ])

    const previousStart = toIsoDate(DateTime.fromISO(range.start).minus({ months: 1 }))
    const byMeter = new Map<number, Array<{ readOn: string; value: number }>>()
    for (const row of readings as Array<{ meter_id: number; read_on: string; value: string }>) {
      const list = byMeter.get(row.meter_id) ?? []
      list.push({ readOn: row.read_on, value: Number(row.value) })
      byMeter.set(row.meter_id, list)
    }

    return {
      billsPaid: { count: num(bills.count), cents: num(bills.cents) },
      subscriptionsCents: num(subscriptions.cents),
      maintenances: (
        maintenances as Array<{
          label: string
          done_on: string
          cost_cents: number | null
          equipment: string
        }>
      ).map((row) => ({
        label: row.label,
        equipment: row.equipment,
        doneOn: row.done_on,
        cents: row.cost_cents,
      })),
      projects: (projects as Array<{ title: string; status: ProjectStatus; spent: number }>).map(
        (row) => ({
          title: row.title,
          status: PROJECT_STATUS_LABELS[row.status],
          spentCents: num(row.spent),
        })
      ),
      claims: (claims as Array<{ title: string; status: ClaimStatus; occurred_on: string }>).map(
        (row) => ({
          title: row.title,
          status: CLAIM_STATUS_LABELS[row.status],
          occurredOn: row.occurred_on,
        })
      ),
      meters: (meters as Array<{ id: number; label: string; kind: MeterKind }>).map((meter) => {
        const list = byMeter.get(meter.id) ?? []
        const current = consumptionBetween(list, range.start, range.next)
        const previous = consumptionBetween(list, previousStart, range.start)
        return {
          label: meter.label,
          unit: METER_UNITS[meter.kind],
          consumption: current?.value ?? null,
          estimated: current?.estimated ?? false,
          previous: previous?.value ?? null,
        }
      }),
      chores: { done: num(chores.done), open: num(chores.open), overdue: num(chores.overdue) },
    }
  }

  private async autoSection(range: Range): Promise<MonthlyReport['auto']> {
    const vehicles = await this.vehicles.all()
    return Promise.all(
      vehicles.map(async (vehicle) => {
        const [detail, maintenances, before, during] = await Promise.all([
          this.vehicles.detail(vehicle.id),
          this.maintenances.forVehicle(vehicle.id),
          this.odometerUntil(vehicle.id, range.start, false),
          this.odometerUntil(vehicle.id, range.end, true),
        ])
        const logs = detail.fuelLogs.filter(
          (log) => log.filledOn >= range.start && log.filledOn <= range.end
        )
        const liters = logs.reduce((total, log) => total + log.liters, 0)
        const fuelCents = logs.reduce((total, log) => total + log.totalCents, 0)
        const perFill = logs
          .map((log) => log.litersPer100Km)
          .filter((value): value is number => value !== null)
        const start = before ?? vehicle.initialOdometerKm
        return {
          name: vehicle.name,
          distanceKm: during !== null && during > start ? during - start : null,
          fillUps: logs.length,
          liters: Math.round(liters * 100) / 100,
          fuelCents,
          pricePerLiterCents: liters > 0 ? Math.round(fuelCents / liters) : null,
          litersPer100Km:
            perFill.length > 0
              ? Math.round((perFill.reduce((a, b) => a + b, 0) / perFill.length) * 10) / 10
              : null,
          maintenances: maintenances.history
            .filter((row) => row.doneOn && row.doneOn >= range.start && row.doneOn <= range.end)
            .map((row) => ({ title: row.title, doneOn: row.doneOn!, cents: row.costCents })),
        }
      })
    )
  }

  /**
   * Highest odometer reading (fill-ups and done maintenances) before a
   * day, or up to it included.
   */
  private async odometerUntil(vehicleId: number, day: string, included: boolean) {
    const operator = included ? '<=' : '<'
    const row = await db
      .from(
        db
          .from('fuel_logs')
          .where('vehicle_id', vehicleId)
          .where('filled_on', operator, day)
          .select('odometer_km')
          .unionAll((query) =>
            query
              .from('maintenances')
              .where('vehicle_id', vehicleId)
              .where('done_on', operator, day)
              .select('odometer_km')
          )
          .as('readings')
      )
      .max('odometer_km as km')
      .first()
    return row?.km === null || row?.km === undefined ? null : Number(row.km)
  }

  private async menuSection(range: Range): Promise<MonthlyReport['menu']> {
    const [counts, top] = await Promise.all([
      db
        .from('meal_plans')
        .whereBetween('planned_on', [range.start, range.end])
        .select(
          db.raw('count(*)::int as planned'),
          db.raw("count(*) filter (where outcome = 'cooked')::int as cooked"),
          db.raw("count(*) filter (where outcome = 'other')::int as other"),
          db.raw("count(*) filter (where outcome = 'eaten_out')::int as eaten_out")
        )
        .firstOrFail(),
      db
        .from('meal_plans')
        .join('recipes', 'recipes.id', 'meal_plans.recipe_id')
        .whereBetween('meal_plans.planned_on', [range.start, range.end])
        .whereRaw("coalesce(meal_plans.outcome, '') not in ('other', 'eaten_out')")
        .select('recipes.name')
        .select(db.raw('count(*)::int as count'))
        .groupBy('recipes.name')
        .orderBy('count', 'desc')
        .orderBy('recipes.name')
        .limit(3),
    ])
    return {
      planned: num(counts.planned),
      cooked: num(counts.cooked),
      other: num(counts.other),
      eatenOut: num(counts.eaten_out),
      topRecipes: (top as Array<{ name: string; count: number }>).map((row) => ({
        name: row.name,
        count: num(row.count),
      })),
    }
  }

  private async routineSection(first: DateTime, range: Range): Promise<MonthlyReport['routine']> {
    const [reviews, habits, tasks] = await Promise.all([
      db
        .from('daily_reviews')
        .whereBetween('day', [range.start, range.end])
        .select('day', 'mood', 'completed_at'),
      db
        .from('habits')
        .leftJoin('habit_checks', (join) => {
          join
            .on('habit_checks.habit_id', 'habits.id')
            .andOnVal('habit_checks.day', '>=', range.start)
            .andOnVal('habit_checks.day', '<=', range.end)
        })
        .whereNull('habits.archived_at')
        .select('habits.name')
        .select(db.raw('count(habit_checks.id)::int as days'))
        .groupBy('habits.id', 'habits.name', 'habits.position')
        .orderBy('habits.position'),
      db
        .from('tasks')
        .where('done_at', '>=', range.start)
        .where('done_at', '<', range.next)
        .whereNull('cancelled_at')
        .select(db.raw('count(*)::int as done'))
        .firstOrFail(),
    ])

    const rows = reviews as Array<{ day: string; mood: number | null; completed_at: Date | null }>
    const completed = new Set(rows.filter((row) => row.completed_at).map((row) => row.day))
    const moods = rows.map((row) => row.mood).filter((mood): mood is number => mood !== null)
    const end = DateTime.min(first.endOf('month').startOf('day'), today())

    return {
      daysInMonth: first.daysInMonth ?? 30,
      reviewedDays: completed.size,
      bestStreak: streaks(completed, end).best,
      averageMood:
        moods.length > 0
          ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10
          : null,
      habits: (habits as Array<{ name: string; days: number }>).map((row) => ({
        name: row.name,
        days: num(row.days),
      })),
      tasksDone: num(tasks.done),
    }
  }

  private async upcomingSection(nextFirst: DateTime): Promise<MonthlyReport['upcoming']> {
    const start = toIsoDate(nextFirst)
    const end = toIsoDate(nextFirst.endOf('month'))
    const inNext = (date: string | null) => date !== null && date >= start && date <= end

    const [bills, debits, maintenances, equipment, contracts] = await Promise.all([
      this.bills.unpaid(),
      this.subscriptions.occurrences(nextFirst, nextFirst.endOf('month')),
      this.maintenances.planned(),
      this.equipmentMaintenances.planned(),
      this.contracts.withNotice(),
    ])
    const debitTotal = debits.reduce(
      (total, { subscription }) => total + subscription.priceCents,
      0
    )

    const items: MonthlyReport['upcoming'] = [
      ...bills
        .filter((bill) => inNext(bill.dueOn))
        .map((bill) => ({
          date: bill.dueOn,
          label: `Facture ${bill.provider}`,
          detail: formatAmount(bill.amountCents),
          domain: 'maison' as const,
        })),
      ...contracts
        .filter((contract) => inNext(contract.noticeBy))
        .map((contract) => ({
          date: contract.noticeBy,
          label: `Préavis ${contract.name}`,
          detail: 'Résilier ou renégocier avant cette date',
          domain: contract.domain,
        })),
      ...maintenances
        .filter((row) => inNext(row.dueOn) || (row.dueOn === null && row.status !== 'planned'))
        .map((row) => ({
          date: row.dueOn,
          label: `${row.title} · ${row.vehicleName}`,
          detail: row.dueOdometerKm !== null ? `à ${formatKm(row.dueOdometerKm)}` : null,
          domain: 'auto' as const,
        })),
      ...equipment
        .filter((row) => inNext(row.dueOn))
        .map((row) => ({
          date: row.dueOn,
          label: `${row.label} · ${row.equipmentName}`,
          detail: null,
          domain: 'maison' as const,
        })),
    ].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))

    if (debits.length > 0) {
      items.push({
        date: null,
        label: `${debits.length} prélèvement(s) d’abonnements`,
        detail: formatAmount(debitTotal),
        domain: 'maison',
      })
    }
    return items
  }
}
