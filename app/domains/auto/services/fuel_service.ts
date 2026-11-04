import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import FuelLog from '#domains/auto/models/fuel_log'
import TransactionService from '#domains/budget/services/transaction_service'
import { fromIsoDate } from '#support/dates'
import { formatLiters } from '#support/format'

export type FuelInput = {
  vehicleId: number
  liters: number
  totalCents: number
  odometerKm: number | null
  filledOn: string
  envelopeId: number | null
  accountId: number | null
}

/**
 * Public service of the Auto domain for fuel logs. A fill-up is also an
 * expense: it is recorded in Budget within the same transaction.
 */
@inject()
export default class FuelService {
  constructor(private transactions: TransactionService) {}

  async log(
    input: FuelInput,
    trx: TransactionClientContract,
    meta: { captureText?: string; vehicleName: string }
  ): Promise<FuelLog> {
    const log = await FuelLog.create(
      {
        vehicleId: input.vehicleId,
        liters: input.liters,
        totalCents: input.totalCents,
        odometerKm: input.odometerKm,
        filledOn: fromIsoDate(input.filledOn),
        captureText: meta.captureText ?? null,
      },
      { client: trx }
    )

    await this.transactions.recordExpense(
      {
        amountCents: input.totalCents,
        label: `Plein ${meta.vehicleName} · ${formatLiters(input.liters)}`,
        occurredOn: input.filledOn,
        envelopeId: input.envelopeId,
        accountId: input.accountId,
      },
      trx,
      { domain: 'auto', sourceType: 'fuel_log', sourceId: log.id, captureText: meta.captureText }
    )

    return log
  }

  async delete(id: number) {
    const log = await FuelLog.findOrFail(id)
    await log.delete()
  }

  /**
   * Cancels a captured fill-up and its expense.
   */
  async undo(id: number, trx: TransactionClientContract) {
    await this.transactions.deleteForSource('fuel_log', id, trx)
    const log = await FuelLog.find(id, { client: trx })
    if (log) await log.delete()
  }
}
