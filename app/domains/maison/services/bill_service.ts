import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Bill from '#domains/maison/models/bill'
import TransactionService from '#domains/budget/services/transaction_service'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type { BillDetail, BillStatus, BillSummary } from '#shared/types/maison'

export type BillInput = {
  provider: string
  amountCents: number
  dueOn: string
  envelopeId?: number | null
  accountId?: number | null
  notes?: string
}

/**
 * Public service of the Maison domain for bills. Paying a bill records the
 * expense in Budget within the same transaction.
 */
@inject()
export default class BillService {
  constructor(private transactions: TransactionService) {}

  async list(): Promise<BillSummary[]> {
    const bills = await Bill.query()
      .orderByRaw('paid_on is not null')
      .orderBy('due_on', 'asc')
      .limit(200)
    return bills.map((bill) => this.toSummary(bill))
  }

  async unpaid(): Promise<BillSummary[]> {
    const bills = await Bill.query().whereNull('paid_on').orderBy('due_on')
    return bills.map((bill) => this.toSummary(bill))
  }

  async detail(id: number): Promise<BillDetail> {
    const bill = await Bill.findOrFail(id)
    return {
      ...this.toSummary(bill),
      envelopeId: bill.envelopeId,
      accountId: bill.accountId,
      notes: bill.notes,
    }
  }

  async create(
    input: BillInput,
    trx?: TransactionClientContract,
    meta: { paidOn?: string; captureText?: string } = {}
  ): Promise<Bill> {
    const run = async (client: TransactionClientContract) => {
      const bill = new Bill().useTransaction(client)
      this.fill(bill, input)
      bill.captureText = meta.captureText ?? null
      await bill.save()
      if (meta.paidOn) await this.pay(bill, meta.paidOn, client)
      client.after('commit', () => this.changed(bill.id))
      return bill
    }
    return trx ? run(trx) : db.transaction(run)
  }

  async update(id: number, input: BillInput): Promise<Bill> {
    return db.transaction(async (trx) => {
      const bill = await Bill.findOrFail(id, { client: trx })
      this.fill(bill, input)
      await bill.save()
      trx.after('commit', () => this.changed(bill.id))
      return bill
    })
  }

  async markPaid(id: number, paidOn: string = toIsoDate(today())) {
    await db.transaction(async (trx) => {
      const bill = await Bill.query({ client: trx }).where('id', id).forUpdate().firstOrFail()
      if (bill.paidOn) throw new Exception('Cette facture est déjà payée', { status: 422 })
      await this.pay(bill, paidOn, trx)
      trx.after('commit', () => this.changed(bill.id))
    })
  }

  /**
   * Removes the bill; the expense of a paid bill stays in Budget.
   */
  async delete(id: number) {
    const bill = await Bill.findOrFail(id)
    await bill.delete()
    await this.changed(id)
  }

  /**
   * Cancels a captured bill entirely, its expense included.
   */
  async undo(id: number, trx: TransactionClientContract) {
    const bill = await Bill.find(id, { client: trx })
    await this.transactions.deleteForSource('bill', id, trx)
    if (bill) await bill.delete()
    trx.after('commit', () => this.changed(id))
  }

  private changed(billId: number) {
    return emitter.emit('maison:bill_changed', { billId })
  }

  private async pay(bill: Bill, paidOn: string, trx: TransactionClientContract) {
    bill.paidOn = fromIsoDate(paidOn)
    await bill.useTransaction(trx).save()
    await this.transactions.recordExpense(
      {
        amountCents: bill.amountCents,
        label: `Facture ${bill.provider}`,
        occurredOn: paidOn,
        envelopeId: bill.envelopeId,
        accountId: bill.accountId,
      },
      trx,
      { domain: 'maison', sourceType: 'bill', sourceId: bill.id }
    )
  }

  private fill(bill: Bill, input: BillInput) {
    bill.merge({
      provider: input.provider,
      amountCents: input.amountCents,
      dueOn: fromIsoDate(input.dueOn),
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId ?? null,
      notes: input.notes ?? null,
    })
  }

  private toSummary(bill: Bill): BillSummary {
    let status: BillStatus = 'due'
    if (bill.paidOn) status = 'paid'
    else if (bill.dueOn < today()) status = 'overdue'
    return {
      id: bill.id,
      provider: bill.provider,
      amountCents: bill.amountCents,
      dueOn: toIsoDate(bill.dueOn),
      paidOn: bill.paidOn ? toIsoDate(bill.paidOn) : null,
      status,
    }
  }
}
