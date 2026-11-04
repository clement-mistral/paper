import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Maintenance from '#domains/auto/models/maintenance'
import Vehicle from '#domains/auto/models/vehicle'
import VehicleService from '#domains/auto/services/vehicle_service'
import TransactionService from '#domains/budget/services/transaction_service'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import {
  MAINTENANCE_KIND_LABELS,
  type DueMaintenance,
  type MaintenanceDetail,
  type MaintenanceKind,
  type MaintenanceRow,
  type VehicleMaintenances,
} from '#shared/types/auto'
import type { Status } from '#shared/types/domain'

/**
 * A planned maintenance becomes « à prévoir » this close to its due date or
 * mileage.
 */
export const UPCOMING_DAYS = 30
export const UPCOMING_KM = 1000

type CommonInput = {
  kind: MaintenanceKind
  label?: string | null
  intervalKm?: number | null
  intervalMonths?: number | null
  envelopeId?: number | null
  accountId?: number | null
  notes?: string | null
}

export type CompletionInput = {
  doneOn: string
  odometerKm?: number | null
  costCents?: number | null
  garage?: string | null
}

export type DoneMaintenanceInput = CommonInput & CompletionInput

export type PlannedMaintenanceInput = CommonInput & {
  dueOn?: string | null
  dueOdometerKm?: number | null
}

export type CompleteInput = CompletionInput & {
  envelopeId?: number | null
  accountId?: number | null
  notes?: string | null
}

const STATUS_ORDER: Record<Status, number> = { overdue: 0, upcoming: 1, planned: 2, done: 3 }

/**
 * Public service of the Auto domain for maintenances. A done maintenance
 * with a cost is also an expense, recorded in Budget within the same
 * transaction; with an interval, the next one is planned.
 */
@inject()
export default class MaintenanceService {
  constructor(
    private transactions: TransactionService,
    private vehicles: VehicleService
  ) {}

  async forVehicle(vehicleId: number): Promise<VehicleMaintenances> {
    const [maintenances, odometer] = await Promise.all([
      Maintenance.query()
        .where('vehicle_id', vehicleId)
        .orderBy('done_on', 'desc')
        .orderBy('id', 'desc'),
      this.vehicles.odometer(vehicleId),
    ])
    const rows = maintenances.map((maintenance) => this.toRow(maintenance, odometer))
    return {
      costCents: rows.reduce((total, row) => total + (row.costCents ?? 0), 0),
      planned: this.byUrgency(rows.filter((row) => row.status !== 'done')),
      history: rows.filter((row) => row.status === 'done'),
    }
  }

  /**
   * Every planned maintenance, with its vehicle, the most urgent first.
   */
  async planned(): Promise<DueMaintenance[]> {
    const [maintenances, vehicles] = await Promise.all([
      Maintenance.query().whereNull('done_on'),
      this.vehicles.list(),
    ])
    const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
    return this.byUrgency(
      maintenances.flatMap((maintenance) => {
        const vehicle = byId.get(maintenance.vehicleId)
        if (!vehicle) return []
        return [{ ...this.toRow(maintenance, vehicle.odometerKm), vehicleName: vehicle.name }]
      })
    )
  }

  async detail(id: number): Promise<MaintenanceDetail> {
    const maintenance = await Maintenance.query().where('id', id).preload('vehicle').firstOrFail()
    const odometer = await this.vehicles.odometer(maintenance.vehicleId)
    return {
      ...this.toRow(maintenance, odometer),
      vehicleName: maintenance.vehicle.name,
      vehicleOdometerKm: odometer,
      envelopeId: maintenance.envelopeId,
      accountId: maintenance.accountId,
      notes: maintenance.notes,
    }
  }

  /**
   * Notes a maintenance already done: its expense, then the next one.
   */
  async createDone(
    vehicleId: number,
    input: DoneMaintenanceInput,
    client?: TransactionClientContract
  ): Promise<{ maintenance: Maintenance; next: Maintenance | null }> {
    const run = async (trx: TransactionClientContract) => {
      const vehicle = await Vehicle.findOrFail(vehicleId, { client: trx })
      const maintenance = new Maintenance().useTransaction(trx)
      maintenance.vehicleId = vehicle.id
      this.fillCommon(maintenance, input)
      this.fillCompletion(maintenance, input)
      await maintenance.save()
      await this.recordExpense(maintenance, vehicle, trx)
      const next = await this.scheduleNext(maintenance, vehicle, trx)
      return { maintenance, next }
    }
    return client ? run(client) : db.transaction(run)
  }

  async createPlanned(vehicleId: number, input: PlannedMaintenanceInput): Promise<Maintenance> {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    const maintenance = new Maintenance()
    maintenance.vehicleId = vehicle.id
    this.fillCommon(maintenance, input)
    this.fillDue(maintenance, input)
    await maintenance.save()
    return maintenance
  }

  /**
   * Edits a done maintenance; its expense follows the new cost, date,
   * envelope and account.
   */
  async updateDone(id: number, input: DoneMaintenanceInput): Promise<Maintenance> {
    return db.transaction(async (trx) => {
      const maintenance = await Maintenance.query({ client: trx })
        .where('id', id)
        .preload('vehicle')
        .forUpdate()
        .firstOrFail()
      if (!maintenance.doneOn) throw new Exception('Cet entretien n’est pas fait', { status: 422 })
      this.fillCommon(maintenance, input)
      this.fillCompletion(maintenance, input)
      await maintenance.save()
      await this.transactions.deleteForSource('maintenance', maintenance.id, trx)
      await this.recordExpense(maintenance, maintenance.vehicle, trx)
      return maintenance
    })
  }

  async updatePlanned(id: number, input: PlannedMaintenanceInput): Promise<Maintenance> {
    const maintenance = await Maintenance.findOrFail(id)
    if (maintenance.doneOn) throw new Exception('Cet entretien est déjà fait', { status: 422 })
    this.fillCommon(maintenance, input)
    this.fillDue(maintenance, input)
    await maintenance.save()
    return maintenance
  }

  /**
   * Marks a planned maintenance as done: records its expense and plans
   * the next one when it has an interval.
   */
  async complete(
    id: number,
    input: CompleteInput,
    client?: TransactionClientContract
  ): Promise<{ maintenance: Maintenance; next: Maintenance | null }> {
    const run = async (trx: TransactionClientContract) => {
      const maintenance = await Maintenance.query({ client: trx })
        .where('id', id)
        .preload('vehicle')
        .forUpdate()
        .firstOrFail()
      if (maintenance.doneOn) throw new Exception('Cet entretien est déjà fait', { status: 422 })

      this.fillCompletion(maintenance, input)
      maintenance.merge({
        envelopeId: input.envelopeId ?? null,
        accountId: input.accountId ?? null,
        notes: input.notes ?? maintenance.notes,
      })
      await maintenance.useTransaction(trx).save()
      await this.recordExpense(maintenance, maintenance.vehicle, trx)
      const next = await this.scheduleNext(maintenance, maintenance.vehicle, trx)
      return { maintenance, next }
    }
    return client ? run(client) : db.transaction(run)
  }

  /**
   * The planned maintenance of that kind a capture should complete, if
   * any (« vidange 89 € » closes the planned oil change).
   */
  async plannedOfKind(vehicleId: number, kind: MaintenanceKind): Promise<Maintenance | null> {
    return Maintenance.query()
      .where({ vehicleId, kind })
      .whereNull('done_on')
      .orderByRaw('due_on is null')
      .orderBy('due_on')
      .first()
  }

  /**
   * Undo of a captured maintenance: deletes it and its expense.
   */
  async undoCreated(id: number, trx: TransactionClientContract) {
    await this.transactions.deleteForSource('maintenance', id, trx)
    await Maintenance.query({ client: trx }).where('id', id).delete()
  }

  /**
   * Undo of a captured completion: the maintenance is planned again.
   */
  async undoCompletion(id: number, trx: TransactionClientContract) {
    await this.transactions.deleteForSource('maintenance', id, trx)
    const maintenance = await Maintenance.find(id, { client: trx })
    if (!maintenance) return
    maintenance.merge({ doneOn: null, odometerKm: null, costCents: null, garage: null })
    await maintenance.useTransaction(trx).save()
  }

  /**
   * Removes the maintenance; the expense of a done one stays in Budget.
   */
  async delete(id: number): Promise<Maintenance> {
    const maintenance = await Maintenance.findOrFail(id)
    await maintenance.delete()
    return maintenance
  }

  /**
   * Status of a maintenance, against today and the vehicle's odometer.
   */
  status(maintenance: Maintenance, odometerKm: number): Status {
    if (maintenance.doneOn) return 'done'
    const day = today()
    const { dueOn, dueOdometerKm } = maintenance
    if ((dueOn && dueOn < day) || (dueOdometerKm !== null && odometerKm >= dueOdometerKm)) {
      return 'overdue'
    }
    if (
      (dueOn && dueOn <= day.plus({ days: UPCOMING_DAYS })) ||
      (dueOdometerKm !== null && dueOdometerKm - odometerKm <= UPCOMING_KM)
    ) {
      return 'upcoming'
    }
    return 'planned'
  }

  private async recordExpense(
    maintenance: Maintenance,
    vehicle: Vehicle,
    trx: TransactionClientContract
  ) {
    if (!maintenance.doneOn || !maintenance.costCents) return
    await this.transactions.recordExpense(
      {
        amountCents: maintenance.costCents,
        label: `Entretien ${vehicle.name} · ${this.title(maintenance)}`,
        occurredOn: toIsoDate(maintenance.doneOn),
        envelopeId: maintenance.envelopeId,
        accountId: maintenance.accountId,
      },
      trx,
      { domain: 'auto', sourceType: 'maintenance', sourceId: maintenance.id }
    )
  }

  /**
   * Plans the next occurrence of a periodic maintenance, counted from the
   * day and the mileage it was done at.
   */
  private async scheduleNext(
    done: Maintenance,
    vehicle: Vehicle,
    trx: TransactionClientContract
  ): Promise<Maintenance | null> {
    if (!done.doneOn || (!done.intervalKm && !done.intervalMonths)) return null
    const baseKm = done.odometerKm ?? (await this.vehicles.odometer(vehicle.id))
    return Maintenance.create(
      {
        vehicleId: vehicle.id,
        kind: done.kind,
        label: done.label,
        intervalKm: done.intervalKm,
        intervalMonths: done.intervalMonths,
        dueOn: done.intervalMonths ? done.doneOn.plus({ months: done.intervalMonths }) : null,
        dueOdometerKm: done.intervalKm ? baseKm + done.intervalKm : null,
        envelopeId: done.envelopeId,
        accountId: done.accountId,
      },
      { client: trx }
    )
  }

  private fillCommon(maintenance: Maintenance, input: CommonInput) {
    maintenance.merge({
      kind: input.kind,
      label: input.label || null,
      intervalKm: input.intervalKm ?? null,
      intervalMonths: input.intervalMonths ?? null,
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId ?? null,
      notes: input.notes || null,
    })
  }

  private fillCompletion(maintenance: Maintenance, input: CompletionInput) {
    maintenance.merge({
      doneOn: fromIsoDate(input.doneOn),
      odometerKm: input.odometerKm ?? null,
      costCents: input.costCents || null,
      garage: input.garage || null,
    })
  }

  private fillDue(maintenance: Maintenance, input: PlannedMaintenanceInput) {
    maintenance.merge({
      dueOn: input.dueOn ? fromIsoDate(input.dueOn) : null,
      dueOdometerKm: input.dueOdometerKm ?? null,
    })
  }

  private title(maintenance: Maintenance): string {
    return maintenance.label || MAINTENANCE_KIND_LABELS[maintenance.kind]
  }

  private byUrgency<T extends MaintenanceRow>(rows: T[]): T[] {
    return [...rows].sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999') ||
        (a.dueOdometerKm ?? Infinity) - (b.dueOdometerKm ?? Infinity)
    )
  }

  private toRow(maintenance: Maintenance, odometerKm: number): MaintenanceRow {
    return {
      id: maintenance.id,
      vehicleId: maintenance.vehicleId,
      kind: maintenance.kind,
      label: maintenance.label,
      title: this.title(maintenance),
      doneOn: maintenance.doneOn ? toIsoDate(maintenance.doneOn) : null,
      odometerKm: maintenance.odometerKm,
      costCents: maintenance.costCents,
      garage: maintenance.garage,
      dueOn: maintenance.dueOn ? toIsoDate(maintenance.dueOn) : null,
      dueOdometerKm: maintenance.dueOdometerKm,
      intervalKm: maintenance.intervalKm,
      intervalMonths: maintenance.intervalMonths,
      status: this.status(maintenance, odometerKm),
    }
  }
}
