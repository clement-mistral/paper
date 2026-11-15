import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import PortfolioService from '#domains/budget/services/portfolio_service'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type { NetWorth, NetWorthHistory, NetWorthPartKey } from '#shared/types/budget'

const LABELS: Record<NetWorthPartKey, string> = {
  current: 'Comptes courants',
  savings: 'Épargne',
  investments: 'Placements',
  vehicles: 'Véhicules',
}

/**
 * Read model of the household's net worth on a day: what the accounts
 * held, the investments valued at that day's close (PortfolioService), and
 * the estimated value of the vehicles (only known today, so counted at
 * that value on every day). Read only.
 */
@inject()
export default class NetWorthView {
  constructor(private portfolio: PortfolioService) {}

  async on(day: string = toIsoDate(today())): Promise<NetWorth> {
    const date = fromIsoDate(day)
    const previous = toIsoDate(date.startOf('month').minus({ days: 1 }))
    const [current, before] = await Promise.all([this.total(day), this.total(previous)])
    return {
      day,
      totalCents: current.totalCents,
      parts: current.parts,
      monthChangeCents: before.hasHistory ? current.totalCents - before.totalCents : null,
    }
  }

  /**
   * Today, and the end of each of the last 12 months.
   */
  async withHistory(): Promise<NetWorthHistory> {
    const now = today()
    const days = Array.from({ length: 12 }, (_, index) => {
      const month = now.minus({ months: 11 - index })
      return index === 11 ? now : month.endOf('month').startOf('day')
    })
    const [worth, points] = await Promise.all([
      this.on(toIsoDate(now)),
      Promise.all(days.map((day) => this.total(toIsoDate(day)))),
    ])
    return {
      ...worth,
      history: days
        .map((day: DateTime, index) => ({ date: toIsoDate(day), ...points[index] }))
        .filter((point) => point.hasHistory)
        .map(({ date, totalCents }) => ({ date, cents: totalCents })),
    }
  }

  private async total(day: string) {
    const [overview, accounts, vehicles, first] = await Promise.all([
      this.portfolio.overview(day),
      db
        .from('accounts')
        .select('accounts.id')
        .select(
          db.raw(
            '(accounts.opening_balance_cents + coalesce((select sum(t.amount_cents) from transactions t where t.account_id = accounts.id and t.occurred_on <= ?), 0))::bigint as balance',
            [day]
          )
        ),
      db.from('vehicles').sum('estimated_value_cents as cents').first(),
      db.from('transactions').select(db.raw('min(occurred_on)::text as day')).first(),
    ])
    const valued = new Set([
      ...overview.accounts.map((account) => account.id),
      ...overview.savings.map((account) => account.id),
    ])
    const parts: Record<NetWorthPartKey, number> = {
      current: accounts
        .filter((row) => !valued.has(Number(row.id)))
        .reduce((total, row) => total + Number(row.balance), 0),
      savings: overview.savings.reduce((total, account) => total + account.balanceCents, 0),
      investments: overview.accounts.reduce((total, account) => total + account.totalCents, 0),
      vehicles: Number(vehicles?.cents ?? 0),
    }
    const firstDay: string | null = first?.day ?? null
    return {
      totalCents: Object.values(parts).reduce((total, cents) => total + cents, 0),
      parts: (Object.keys(parts) as NetWorthPartKey[])
        .filter((key) => parts[key] !== 0)
        .map((key) => ({ key, label: LABELS[key], cents: parts[key] })),
      /** Days before the first transaction are not history yet. */
      hasHistory: firstDay !== null && firstDay <= day,
    }
  }
}
