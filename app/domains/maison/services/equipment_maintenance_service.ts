import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Equipment from '#domains/maison/models/equipment'
import EquipmentMaintenance from '#domains/maison/models/equipment_maintenance'
import TransactionService from '#domains/budget/services/transaction_service'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type {
  DueEquipmentMaintenance,
  EquipmentMaintenanceDetail,
  EquipmentMaintenanceRow,
} from '#shared/types/maison'
import type { Status } from '#shared/types/domain'

/**
 * A planned maintenance becomes « à prévoir » this close to its due date.
 */
export const UPCOMING_DAYS = 30

type CommonInput = {
  label: string
  intervalMonths?: number | null
  envelopeId?: number | null
  accountId?: number | null
  notes?: string | null
}

export type CompletionInput = {
  doneOn: string
  costCents?: number | null
  provider?: string | null
}

export type DoneEquipmentMaintenanceInput = CommonInput & CompletionInput
export type PlannedEquipmentMaintenanceInput = CommonInput & { dueOn: string }
export type CompleteEquipmentMaintenanceInput = CompletionInput & {
  envelopeId?: number | null
  accountId?: number | null
  notes?: string | null
}

const STATUS_ORDER: Record<Status, number> = { overdue: 0, upcoming: 1, planned: 2, done: 3 }

/**
 * Status of a maintenance against today.
 */
export function maintenanceStatus(
  maintenance: Pick<EquipmentMaintenance, 'doneOn' | 'dueOn'>
): Status {
  if (maintenance.doneOn) return 'done'
  const day = today()
  if (maintenance.dueOn && maintenance.dueOn < day) return 'overdue'
  if (maintenance.dueOn && maintenance.dueOn <= day.plus({ days: UPCOMING_DAYS })) {
    return 'upcoming'
  }
  return 'planned'
}

export function byUrgency<T extends EquipmentMaintenanceRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999')
  )
}

export function toMaintenanceRow(maintenance: EquipmentMaintenance): EquipmentMaintenanceRow {
  return {
    id: maintenance.id,
    equipmentId: maintenance.equipmentId,
    label: maintenance.label,
    doneOn: maintenance.doneOn ? toIsoDate(maintenance.doneOn) : null,
    costCents: maintenance.costCents,
    provider: maintenance.provider,
    dueOn: maintenance.dueOn ? toIsoDate(maintenance.dueOn) : null,
    intervalMonths: maintenance.intervalMonths,
    status: maintenanceStatus(maintenance),
  }
}

/**
 * Public service of the Maison domain for equipment maintenances (boiler,
 * ventilation…). A done maintenance with a cost is also an expense,
 * recorded in Budget within the same transaction; with an interval, the
 * next one is planned.
 */
@inject()
export default class EquipmentMaintenanceService {
  constructor(private transactions: TransactionService) {}

  /**
   * Every planned maintenance, with its equipment, the most urgent first.
   */
  async planned(): Promise<DueEquipmentMaintenance[]> {
    const maintenances = await EquipmentMaintenance.query()
      .whereNull('done_on')
      .preload('equipment')
    return byUrgency(
      maintenances.map((maintenance) => ({
        ...toMaintenanceRow(maintenance),
        equipmentName: maintenance.equipment.name,
      }))
    )
  }

  async detail(id: number): Promise<EquipmentMaintenanceDetail> {
    const maintenance = await EquipmentMaintenance.query()
      .where('id', id)
      .preload('equipment')
      .firstOrFail()
    return {
      ...toMaintenanceRow(maintenance),
      equipmentName: maintenance.equipment.name,
      homeId: maintenance.equipment.homeId,
      envelopeId: maintenance.envelopeId,
      accountId: maintenance.accountId,
      notes: maintenance.notes,
    }
  }

  async createDone(
    equipmentId: number,
    input: DoneEquipmentMaintenanceInput
  ): Promise<EquipmentMaintenance> {
    return db.transaction(async (trx) => {
      const equipment = await Equipment.findOrFail(equipmentId, { client: trx })
      const maintenance = new EquipmentMaintenance().useTransaction(trx)
      maintenance.equipmentId = equipment.id
      this.fillCommon(maintenance, input)
      this.fillCompletion(maintenance, input)
      await maintenance.save()
      await this.recordExpense(maintenance, equipment, trx)
      await this.scheduleNext(maintenance, trx)
      return maintenance
    })
  }

  async createPlanned(
    equipmentId: number,
    input: PlannedEquipmentMaintenanceInput
  ): Promise<EquipmentMaintenance> {
    const equipment = await Equipment.findOrFail(equipmentId)
    const maintenance = new EquipmentMaintenance()
    maintenance.equipmentId = equipment.id
    this.fillCommon(maintenance, input)
    maintenance.dueOn = fromIsoDate(input.dueOn)
    await maintenance.save()
    return maintenance
  }

  /**
   * Edits a done maintenance; its expense follows.
   */
  async updateDone(
    id: number,
    input: DoneEquipmentMaintenanceInput
  ): Promise<EquipmentMaintenance> {
    return db.transaction(async (trx) => {
      const maintenance = await EquipmentMaintenance.query({ client: trx })
        .where('id', id)
        .preload('equipment')
        .forUpdate()
        .firstOrFail()
      if (!maintenance.doneOn) throw new Exception('Cet entretien n’est pas fait', { status: 422 })
      this.fillCommon(maintenance, input)
      this.fillCompletion(maintenance, input)
      await maintenance.save()
      await this.transactions.deleteForSource('equipment_maintenance', maintenance.id, trx)
      await this.recordExpense(maintenance, maintenance.equipment, trx)
      return maintenance
    })
  }

  async updatePlanned(
    id: number,
    input: PlannedEquipmentMaintenanceInput
  ): Promise<EquipmentMaintenance> {
    const maintenance = await EquipmentMaintenance.findOrFail(id)
    if (maintenance.doneOn) throw new Exception('Cet entretien est déjà fait', { status: 422 })
    this.fillCommon(maintenance, input)
    maintenance.dueOn = fromIsoDate(input.dueOn)
    await maintenance.save()
    return maintenance
  }

  async complete(
    id: number,
    input: CompleteEquipmentMaintenanceInput
  ): Promise<{ maintenance: EquipmentMaintenance; next: EquipmentMaintenance | null }> {
    return db.transaction(async (trx) => {
      const maintenance = await EquipmentMaintenance.query({ client: trx })
        .where('id', id)
        .preload('equipment')
        .forUpdate()
        .firstOrFail()
      if (maintenance.doneOn) throw new Exception('Cet entretien est déjà fait', { status: 422 })

      this.fillCompletion(maintenance, input)
      maintenance.merge({
        envelopeId: input.envelopeId ?? null,
        accountId: input.accountId ?? null,
        notes: input.notes || maintenance.notes,
      })
      await maintenance.useTransaction(trx).save()
      await this.recordExpense(maintenance, maintenance.equipment, trx)
      const next = await this.scheduleNext(maintenance, trx)
      return { maintenance, next }
    })
  }

  /**
   * Removes the maintenance; the expense of a done one stays in Budget.
   */
  async delete(id: number): Promise<EquipmentMaintenance> {
    const maintenance = await EquipmentMaintenance.query()
      .where('id', id)
      .preload('equipment')
      .firstOrFail()
    await maintenance.delete()
    return maintenance
  }

  private async recordExpense(
    maintenance: EquipmentMaintenance,
    equipment: Equipment,
    trx: TransactionClientContract
  ) {
    if (!maintenance.doneOn || !maintenance.costCents) return
    await this.transactions.recordExpense(
      {
        amountCents: maintenance.costCents,
        label: `Entretien ${equipment.name} · ${maintenance.label}`,
        occurredOn: toIsoDate(maintenance.doneOn),
        envelopeId: maintenance.envelopeId,
        accountId: maintenance.accountId,
      },
      trx,
      { domain: 'maison', sourceType: 'equipment_maintenance', sourceId: maintenance.id }
    )
  }

  /**
   * Plans the next occurrence, counted from the day it was done.
   */
  private async scheduleNext(
    done: EquipmentMaintenance,
    trx: TransactionClientContract
  ): Promise<EquipmentMaintenance | null> {
    if (!done.doneOn || !done.intervalMonths) return null
    return EquipmentMaintenance.create(
      {
        equipmentId: done.equipmentId,
        label: done.label,
        intervalMonths: done.intervalMonths,
        dueOn: done.doneOn.plus({ months: done.intervalMonths }),
        envelopeId: done.envelopeId,
        accountId: done.accountId,
      },
      { client: trx }
    )
  }

  private fillCommon(maintenance: EquipmentMaintenance, input: CommonInput) {
    maintenance.merge({
      label: input.label,
      intervalMonths: input.intervalMonths ?? null,
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId ?? null,
      notes: input.notes || null,
    })
  }

  private fillCompletion(maintenance: EquipmentMaintenance, input: CompletionInput) {
    maintenance.merge({
      doneOn: fromIsoDate(input.doneOn),
      costCents: input.costCents || null,
      provider: input.provider || null,
    })
  }
}
