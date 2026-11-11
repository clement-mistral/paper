import { Exception } from '@adonisjs/core/exceptions'
import { errors } from '@vinejs/vine'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Account from '#domains/budget/models/account'
import Transaction from '#domains/budget/models/transaction'
import Transfer from '#domains/budget/models/transfer'
import { fromIsoDate } from '#support/dates'
import type { Domain } from '#shared/types/domain'

/**
 * Where an expense comes from, when another domain produced it.
 */
export type ExpenseMeta = {
  captureText?: string
  domain?: Domain
  sourceType?: string
  sourceId?: number
}

/**
 * SQL condition keeping transactions that are real money in or out: the
 * two legs of a transfer between accounts, and the purchases and sales of
 * an investment account (cash turned into shares and back), are neither
 * an expense nor income. Every spending or income aggregation must use it.
 */
export const NOT_TRANSFER_SQL =
  "(transactions.source_type is null or transactions.source_type not in ('transfer', 'investment_trade'))"

export const TRANSFER_SOURCE = 'transfer'

/** Cash of an investment account spent on a purchase or got from a sale. */
export const TRADE_SOURCE = 'investment_trade'

export type IncomeInput = {
  amountCents: number
  label: string
  occurredOn: string
  accountId: number | null
  /** Rare: a refund booked back on an envelope reduces what it spent. */
  envelopeId?: number | null
}

export type TransferInput = {
  fromAccountId: number
  toAccountId: number
  amountCents: number
  occurredOn: string
  label?: string | null
}

export type ExpenseInput = {
  amountCents: number
  label: string
  occurredOn: string
  envelopeId: number | null
  accountId: number | null
}

/**
 * Public service of the Budget domain for transactions. Other domains call
 * it inside their own transaction when a money movement must be atomic.
 */
export default class TransactionService {
  /**
   * Records an expense. `amountCents` is positive, it is stored negative.
   */
  async recordExpense(
    input: ExpenseInput,
    trx: TransactionClientContract,
    meta: ExpenseMeta = {}
  ): Promise<Transaction> {
    const transaction = new Transaction().useTransaction(trx)
    transaction.amountCents = -Math.abs(input.amountCents)
    transaction.label = input.label
    transaction.occurredOn = fromIsoDate(input.occurredOn)
    transaction.envelopeId = input.envelopeId
    transaction.accountId = input.accountId
    transaction.domain = meta.domain ?? 'budget'
    transaction.sourceType = meta.sourceType ?? null
    transaction.sourceId = meta.sourceId ?? null
    transaction.captureText = meta.captureText ?? null
    await transaction.save()
    return transaction
  }

  /**
   * Records money coming in (salary, refund, sale…). `amountCents` is
   * positive and stored positive.
   */
  async recordIncome(
    input: IncomeInput,
    trx: TransactionClientContract,
    meta: { captureText?: string; sourceType?: string; sourceId?: number } = {}
  ): Promise<Transaction> {
    const transaction = new Transaction().useTransaction(trx)
    transaction.merge({
      sourceType: meta.sourceType ?? null,
      sourceId: meta.sourceId ?? null,
      amountCents: Math.abs(input.amountCents),
      label: input.label,
      occurredOn: fromIsoDate(input.occurredOn),
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId,
      domain: 'budget',
      captureText: meta.captureText ?? null,
    })
    await transaction.save()
    return transaction
  }

  /**
   * Cash moved inside an investment account by a purchase (negative) or a
   * sale (positive): neither spent nor earned.
   */
  async recordTrade(
    input: { accountId: number; amountCents: number; label: string; occurredOn: string },
    sourceId: number,
    trx: TransactionClientContract,
    meta: { captureText?: string } = {}
  ): Promise<Transaction> {
    return Transaction.create(
      {
        accountId: input.accountId,
        envelopeId: null,
        label: input.label,
        amountCents: input.amountCents,
        occurredOn: fromIsoDate(input.occurredOn),
        domain: 'budget',
        sourceType: TRADE_SOURCE,
        sourceId,
        captureText: meta.captureText ?? null,
      },
      { client: trx }
    )
  }

  /**
   * Moves money between two accounts: a debit on one, a credit on the
   * other, both linked to the transfer.
   */
  async transfer(
    input: TransferInput,
    trx: TransactionClientContract,
    meta: { captureText?: string } = {}
  ): Promise<Transfer> {
    if (input.fromAccountId === input.toAccountId) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'toAccountId',
          message: 'Choisissez deux comptes différents.',
          rule: 'different_account',
        },
      ])
    }
    const [from, to] = await Promise.all([
      Account.findOrFail(input.fromAccountId, { client: trx }),
      Account.findOrFail(input.toAccountId, { client: trx }),
    ])
    const label = input.label || `Virement ${from.name} → ${to.name}`
    const transfer = await Transfer.create(
      {
        fromAccountId: from.id,
        toAccountId: to.id,
        amountCents: Math.abs(input.amountCents),
        occurredOn: fromIsoDate(input.occurredOn),
        label,
        captureText: meta.captureText ?? null,
      },
      { client: trx }
    )
    for (const [accountId, sign] of [
      [from.id, -1],
      [to.id, 1],
    ] as const) {
      await Transaction.create(
        {
          accountId,
          envelopeId: null,
          label,
          amountCents: sign * Math.abs(input.amountCents),
          occurredOn: transfer.occurredOn,
          domain: 'budget',
          sourceType: TRANSFER_SOURCE,
          sourceId: transfer.id,
          captureText: meta.captureText ?? null,
        },
        { client: trx }
      )
    }
    return transfer
  }

  /**
   * Cancels a transfer and both its legs.
   */
  async deleteTransfer(id: number, trx: TransactionClientContract) {
    await this.deleteForSource(TRANSFER_SOURCE, id, trx)
    await Transfer.query({ client: trx }).where('id', id).delete()
  }

  /**
   * Deletes a transaction typed by hand (an expense or an income without
   * source); the ones produced by another domain are removed from there.
   */
  async deleteManual(id: number, trx: TransactionClientContract) {
    const transaction = await Transaction.findOrFail(id, { client: trx })
    if (transaction.sourceType === TRANSFER_SOURCE && transaction.sourceId) {
      return this.deleteTransfer(transaction.sourceId, trx)
    }
    if (transaction.sourceType !== null) {
      throw new Exception('Cette transaction se supprime depuis sa fiche', { status: 422 })
    }
    await transaction.delete()
  }

  /**
   * Whether an item of another domain already produced a transaction on
   * that date (keeps scheduled debits idempotent).
   */
  async existsForSource(
    sourceType: string,
    sourceId: number,
    occurredOn: string,
    trx: TransactionClientContract
  ): Promise<boolean> {
    const row = await Transaction.query({ client: trx })
      .where({ sourceType, sourceId })
      .where('occurred_on', occurredOn)
      .first()
    return row !== null
  }

  /**
   * Removes what an item of another domain produced (undo, deletion).
   */
  async deleteForSource(sourceType: string, sourceId: number, trx: TransactionClientContract) {
    await Transaction.query({ client: trx }).where({ sourceType, sourceId }).delete()
  }

  async delete(id: number, trx: TransactionClientContract) {
    await Transaction.query({ client: trx }).where('id', id).delete()
  }

  /**
   * Spent amount (positive cents) per source item, in one query.
   */
  async totalsForSources(sourceType: string, sourceIds: number[]): Promise<Map<number, number>> {
    const totals = new Map<number, number>()
    if (sourceIds.length === 0) return totals
    const rows = await Transaction.query()
      .where('source_type', sourceType)
      .whereIn('source_id', sourceIds)
      .where('amount_cents', '<', 0)
      .groupBy('source_id')
      .select('source_id')
      .sum('amount_cents as total')
    for (const row of rows) {
      totals.set(Number(row.sourceId), Math.abs(Number(row.$extras.total ?? 0)))
    }
    return totals
  }

  /**
   * Transactions produced by an item of another domain, newest first.
   */
  async forSource(sourceType: string, sourceId: number): Promise<Transaction[]> {
    return Transaction.query().where({ sourceType, sourceId }).orderBy('occurred_on', 'desc')
  }
}
