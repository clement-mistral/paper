import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Subscription from '#domains/maison/models/subscription'
import { monthlyCost, nextBillingDate } from '#domains/maison/services/billing_schedule'
import TransactionService from '#domains/budget/services/transaction_service'
import { toIsoDate, today } from '#support/dates'
import type { Frequency, SubscriptionDetail, SubscriptionSummary } from '#shared/types/maison'
import type { TransactionRow } from '#shared/types/budget'

export type SubscriptionInput = {
  name: string
  priceCents: number
  frequency: Frequency
  billingDay: number
  billingMonth?: number | null
  envelopeId?: number | null
  accountId?: number | null
  isActive?: boolean
  notes?: string
}

/**
 * Public service of the Maison domain for subscriptions. Debits are
 * recorded automatically in Budget on the billing day (`chargeDue`).
 */
@inject()
export default class SubscriptionService {
  constructor(private transactions: TransactionService) {}

  async list(): Promise<SubscriptionSummary[]> {
    const subscriptions = await Subscription.query()
      .orderBy('is_active', 'desc')
      .orderBy('next_billing_on')
    return subscriptions.map((subscription) => this.toSummary(subscription))
  }

  async detail(id: number): Promise<SubscriptionDetail> {
    const subscription = await Subscription.findOrFail(id)
    return {
      ...this.toSummary(subscription),
      billingDay: subscription.billingDay,
      billingMonth: subscription.billingMonth,
      envelopeId: subscription.envelopeId,
      accountId: subscription.accountId,
      notes: subscription.notes,
    }
  }

  /**
   * Upcoming debits between two dates (included), computed from each
   * active subscription schedule.
   */
  async occurrences(
    start: DateTime,
    end: DateTime
  ): Promise<Array<{ subscription: SubscriptionSummary; date: DateTime }>> {
    const subscriptions = await Subscription.query()
      .where('is_active', true)
      .where('next_billing_on', '<=', toIsoDate(end))
    const occurrences: Array<{ subscription: SubscriptionSummary; date: DateTime }> = []
    for (const subscription of subscriptions) {
      let date = subscription.nextBillingOn
      while (date <= end) {
        if (date >= start) occurrences.push({ subscription: this.toSummary(subscription), date })
        date = nextBillingDate(
          subscription.frequency,
          subscription.billingDay,
          subscription.billingMonth,
          date.plus({ days: 1 })
        )
      }
    }
    return occurrences.sort((a, b) => a.date.toMillis() - b.date.toMillis())
  }

  /**
   * Debits already recorded in Budget for this subscription.
   */
  async charges(id: number): Promise<TransactionRow[]> {
    const rows = await this.transactions.forSource('subscription', id)
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      amountCents: row.amountCents,
      occurredOn: toIsoDate(row.occurredOn),
      domain: row.domain,
      envelope: null,
      account: null,
      kind: 'expense' as const,
      deletable: false,
    }))
  }

  async create(input: SubscriptionInput, trx?: TransactionClientContract): Promise<Subscription> {
    const run = async (client: TransactionClientContract) => {
      const subscription = new Subscription().useTransaction(client)
      this.fill(subscription, input)
      subscription.nextBillingOn = this.firstBilling(input, today())
      await subscription.save()
      return subscription
    }
    return trx ? run(trx) : db.transaction(run)
  }

  async update(id: number, input: SubscriptionInput): Promise<Subscription> {
    return db.transaction(async (trx) => {
      const subscription = await Subscription.findOrFail(id, { client: trx })
      const scheduleChanged =
        subscription.frequency !== input.frequency ||
        subscription.billingDay !== input.billingDay ||
        subscription.billingMonth !== (input.billingMonth ?? null)
      this.fill(subscription, input)
      if (scheduleChanged) subscription.nextBillingOn = this.firstBilling(input, today())
      await subscription.save()
      return subscription
    })
  }

  async delete(id: number) {
    const subscription = await Subscription.findOrFail(id)
    await subscription.delete()
  }

  /**
   * Cancels a captured subscription, with the debits it already produced.
   */
  async undo(id: number, trx: TransactionClientContract) {
    await this.transactions.deleteForSource('subscription', id, trx)
    const subscription = await Subscription.find(id, { client: trx })
    if (subscription) await subscription.delete()
  }

  /**
   * Next debit date for a new or rescheduled subscription.
   */
  firstBilling(
    input: Pick<SubscriptionInput, 'frequency' | 'billingDay' | 'billingMonth'>,
    from: DateTime
  ): DateTime {
    return nextBillingDate(input.frequency, input.billingDay, input.billingMonth ?? null, from)
  }

  /**
   * Records every debit due on or before `reference` and moves the next
   * billing date forward. Idempotent and catches up missed debits (server
   * down during several days).
   */
  async chargeDue(reference: DateTime = today()): Promise<number> {
    const due = await Subscription.query()
      .where('is_active', true)
      .where('next_billing_on', '<=', toIsoDate(reference))

    let charged = 0
    for (const { id } of due) {
      charged += await db.transaction(async (trx) => {
        const subscription = await Subscription.query({ client: trx })
          .where('id', id)
          .forUpdate()
          .firstOrFail()

        let count = 0
        while (subscription.nextBillingOn <= reference) {
          const occurredOn = toIsoDate(subscription.nextBillingOn)
          const exists = await this.transactions.existsForSource(
            'subscription',
            subscription.id,
            occurredOn,
            trx
          )
          if (!exists) {
            await this.transactions.recordExpense(
              {
                amountCents: subscription.priceCents,
                label: subscription.name,
                occurredOn,
                envelopeId: subscription.envelopeId,
                accountId: subscription.accountId,
              },
              trx,
              { domain: 'maison', sourceType: 'subscription', sourceId: subscription.id }
            )
            count++
          }
          subscription.nextBillingOn = nextBillingDate(
            subscription.frequency,
            subscription.billingDay,
            subscription.billingMonth,
            subscription.nextBillingOn.plus({ days: 1 })
          )
        }
        await subscription.save()
        return count
      })
    }

    if (charged > 0) logger.info({ charged }, 'subscription debits recorded')
    return charged
  }

  private fill(subscription: Subscription, input: SubscriptionInput) {
    subscription.merge({
      name: input.name,
      priceCents: input.priceCents,
      frequency: input.frequency,
      billingDay: input.billingDay,
      billingMonth: input.frequency === 'yearly' ? (input.billingMonth ?? null) : null,
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId ?? null,
      isActive: input.isActive ?? true,
      notes: input.notes ?? null,
    })
  }

  private toSummary(subscription: Subscription): SubscriptionSummary {
    return {
      id: subscription.id,
      name: subscription.name,
      priceCents: subscription.priceCents,
      frequency: subscription.frequency,
      monthlyCostCents: monthlyCost(subscription.priceCents, subscription.frequency),
      nextBillingOn: toIsoDate(subscription.nextBillingOn),
      isActive: subscription.isActive,
    }
  }
}
