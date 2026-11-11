import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import {
  NOT_TRANSFER_SQL,
  TRADE_SOURCE,
  TRANSFER_SOURCE,
} from '#domains/budget/services/transaction_service'
import { today, toIsoDate } from '#support/dates'
import type { MonthlyAmount, MoneyOverview, TransactionRow } from '#shared/types/budget'

/**
 * Read model of the « Argent » page: every euro, whatever produced it.
 * Read only.
 */
@inject()
export default class MoneyView {
  constructor(
    private accounts: AccountService,
    private envelopes: EnvelopeService
  ) {}

  async overview(): Promise<MoneyOverview> {
    const start = toIsoDate(today().startOf('month'))
    const end = toIsoDate(today().endOf('month'))

    const [accounts, envelopes, month, transactions, monthlySpending] = await Promise.all([
      this.accounts.list(),
      this.envelopes.list(),
      db
        .from('transactions')
        .whereBetween('occurred_on', [start, end])
        .whereRaw(NOT_TRANSFER_SQL)
        .select(
          db.raw('coalesce(-sum(amount_cents) filter (where amount_cents < 0), 0)::int as spent')
        )
        .select(
          db.raw('coalesce(sum(amount_cents) filter (where amount_cents > 0), 0)::int as income')
        )
        .firstOrFail(),
      this.recentTransactions(),
      this.monthlySpending(),
    ])

    return {
      netWorthCents: accounts.reduce((total, account) => total + account.balanceCents, 0),
      spentThisMonthCents: Number(month.spent),
      incomeThisMonthCents: Number(month.income),
      budgetedThisMonthCents: envelopes.reduce((total, e) => total + e.monthlyBudgetCents, 0),
      envelopes,
      transactions,
      monthlySpending,
    }
  }

  /**
   * Expenses per month over the `months` months ending with the month of
   * `until` (included), oldest first. Months without expenses count 0.
   */
  async monthlySpending(
    filter: { envelopeId?: number } = {},
    months = 12,
    until: DateTime = today()
  ): Promise<MonthlyAmount[]> {
    const keys = this.lastMonths(months, until)
    const query = db
      .from('transactions')
      .where('amount_cents', '<', 0)
      .whereRaw(NOT_TRANSFER_SQL)
      .where('occurred_on', '>=', `${keys[0]}-01`)
      .where('occurred_on', '<=', toIsoDate(until.endOf('month')))
      .select(db.raw("to_char(occurred_on, 'YYYY-MM') as month"))
      .select(db.raw('-sum(amount_cents)::int as cents'))
      .groupByRaw("to_char(occurred_on, 'YYYY-MM')")
    if (filter.envelopeId) query.where('envelope_id', filter.envelopeId)
    const rows: Array<{ month: string; cents: number }> = await query
    const byMonth = new Map(rows.map((row) => [row.month, Number(row.cents)]))
    return keys.map((month) => ({ month, cents: byMonth.get(month) ?? 0 }))
  }

  /**
   * Balance of an account at the end of each of the last `months` months
   * (today for the current one), oldest first.
   */
  async balanceHistory(
    accountId: number,
    openingBalanceCents: number,
    months = 12
  ): Promise<MonthlyAmount[]> {
    const keys = this.lastMonths(months)
    const [before, rows] = await Promise.all([
      db
        .from('transactions')
        .where('account_id', accountId)
        .where('occurred_on', '<', `${keys[0]}-01`)
        .select(db.raw('coalesce(sum(amount_cents), 0)::int as total'))
        .firstOrFail(),
      db
        .from('transactions')
        .where('account_id', accountId)
        .where('occurred_on', '>=', `${keys[0]}-01`)
        .where('occurred_on', '<=', toIsoDate(today()))
        .select(db.raw("to_char(occurred_on, 'YYYY-MM') as month"))
        .select(db.raw('sum(amount_cents)::int as cents'))
        .groupByRaw("to_char(occurred_on, 'YYYY-MM')"),
    ])
    const byMonth = new Map(
      (rows as Array<{ month: string; cents: number }>).map((row) => [row.month, Number(row.cents)])
    )
    let balance = openingBalanceCents + Number(before.total)
    return keys.map((month) => {
      balance += byMonth.get(month) ?? 0
      return { month, cents: balance }
    })
  }

  private lastMonths(count: number, until: DateTime = today()): string[] {
    const current = until.startOf('month')
    return Array.from({ length: count }, (_, index) =>
      current.minus({ months: count - 1 - index }).toFormat('yyyy-LL')
    )
  }

  /**
   * Expenses between two days (included), optionally restricted to an
   * envelope or to labels containing a word. Positive cents.
   */
  async spending(
    start: string,
    end: string,
    filter: { envelopeId?: number; word?: string } = {}
  ): Promise<{ totalCents: number; byEnvelope: Array<{ name: string; totalCents: number }> }> {
    const base = () => {
      const query = db
        .from('transactions')
        .leftJoin('envelopes', 'envelopes.id', 'transactions.envelope_id')
        .whereBetween('transactions.occurred_on', [start, end])
        .where('transactions.amount_cents', '<', 0)
        .whereRaw(NOT_TRANSFER_SQL)
      if (filter.envelopeId) query.where('transactions.envelope_id', filter.envelopeId)
      if (filter.word) {
        query.whereRaw('unaccent(lower(transactions.label)) like ?', [`%${filter.word}%`])
      }
      return query
    }

    const [total, groups] = await Promise.all([
      base()
        .select(db.raw('coalesce(-sum(transactions.amount_cents), 0)::int as total'))
        .firstOrFail(),
      base()
        .select(db.raw("coalesce(envelopes.name, 'Sans enveloppe') as name"))
        .select(db.raw('-sum(transactions.amount_cents)::int as total'))
        .groupBy('envelopes.name')
        .orderBy('total', 'desc'),
    ])

    return {
      totalCents: Number(total.total),
      byEnvelope: groups.map((row: { name: string; total: number }) => ({
        name: row.name,
        totalCents: Number(row.total),
      })),
    }
  }

  /**
   * Every transaction dated on a day, oldest first.
   */
  async transactionsOn(day: string): Promise<TransactionRow[]> {
    const rows = await Transaction.query()
      .where('occurred_on', day)
      .preload('envelope')
      .preload('account')
      .orderBy('id')
    return rows.map((row) => this.toRow(row))
  }

  async recentTransactions(
    filter: { accountId?: number; envelopeId?: number } = {},
    limit = 50
  ): Promise<TransactionRow[]> {
    const query = Transaction.query()
      .preload('envelope')
      .preload('account')
      .orderBy('occurred_on', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)

    if (filter.accountId) query.where('account_id', filter.accountId)
    if (filter.envelopeId) query.where('envelope_id', filter.envelopeId)

    const rows = await query
    return rows.map((row) => this.toRow(row))
  }

  private toRow(row: Transaction): TransactionRow {
    return {
      id: row.id,
      label: row.label,
      amountCents: row.amountCents,
      occurredOn: toIsoDate(row.occurredOn),
      domain: row.domain,
      envelope: row.envelope ? { id: row.envelope.id, name: row.envelope.name } : null,
      account: row.account ? { id: row.account.id, name: row.account.name } : null,
      kind:
        row.sourceType === TRANSFER_SOURCE || row.sourceType === TRADE_SOURCE
          ? 'transfer'
          : row.amountCents < 0
            ? 'expense'
            : 'income',
      deletable: row.sourceType === null || row.sourceType === TRANSFER_SOURCE,
    }
  }
}
