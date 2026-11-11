import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import Account from '#domains/budget/models/account'
import Holding from '#domains/budget/models/holding'
import InvestmentOperation from '#domains/budget/models/investment_operation'
import QuoteService from '#domains/budget/services/quote_service'
import TransactionService, { TRADE_SOURCE } from '#domains/budget/services/transaction_service'
import { MARKET_NAMES } from '#domains/budget/market/yahoo'
import {
  closeOn,
  type Operation,
  oversold,
  positionOf,
  simpleDietz,
  tradeAmountCents,
} from '#domains/budget/portfolio'
import type { Chart } from '#domains/budget/market/yahoo'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import { formatAmount } from '#support/format'
import {
  ASSET_CLASS_LABELS,
  type AllocationSlice,
  type AssetClass,
  type HoldingDetail,
  type HoldingRow,
  type OperationKind,
  type OperationRow,
  type PortfolioAccount,
  type PortfolioOverview,
} from '#shared/types/budget'

/** Transactions of the dividends (income) and fees (expenses) of a line. */
export const DIVIDEND_SOURCE = 'investment_income'
export const FEE_SOURCE = 'investment_fee'

/** A quote older than this is flagged; a value typed by hand, after 90 days. */
const STALE_QUOTE_DAYS = 7
const STALE_MANUAL_DAYS = 90

export type OperationInput = {
  accountId: number
  /** An existing line of the account… */
  holdingId?: number | null
  /** …or a new one, found by its symbol or its name. */
  symbol?: string | null
  name?: string | null
  assetClass?: AssetClass | null
  kind: OperationKind
  occurredOn: string
  /** Purchase and sale: units and the price of one, in euros. */
  quantity?: number | null
  unitPrice?: number | null
  feesCents?: number | null
  /** Dividend and fee: the amount received or paid. */
  amountCents?: number | null
}

export type HoldingInput = {
  name: string
  assetClass: AssetClass
  /** Unit value typed by hand, euros; null to rely on the quotes. */
  manualPrice: number | null
  notes: string | null
}

/** Internal: a valued line and what the year-to-date return needs. */
type Valued = HoldingRow & {
  yearStartCents: number
  yearFlows: Array<{ cents: number; weight: number }>
  yearIncomeCents: number
  ytdKnown: boolean
}

/** An account as the pages see it, without the year-to-date workings. */
function withoutLines({
  lines: _lines,
  ...account
}: PortfolioAccount & { lines: Valued[] }): PortfolioAccount {
  return account
}

function invalid(field: string, message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field, message, rule: 'portfolio' }])
}

function sourceOf(kind: OperationKind): string {
  if (kind === 'dividend') return DIVIDEND_SOURCE
  if (kind === 'fee') return FEE_SOURCE
  return TRADE_SOURCE
}

/** « 3 », « 0,125 » */
function quantityLabel(quantity: number): string {
  return quantity.toLocaleString('fr-FR', { maximumFractionDigits: 8 })
}

/**
 * Public service of the Budget domain for investments: the lines of the
 * investment accounts, their operations (each with its money movement on
 * the account, in the same transaction) and their value on a day.
 */
@inject()
export default class PortfolioService {
  constructor(
    private quotes: QuoteService,
    private transactions: TransactionService
  ) {}

  /* ------------------------------------------------------------------ */
  /* Operations                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Records a purchase, a sale, a dividend or a fee, and its money on the
   * account: a trade moves the cash (neither spent nor earned), a dividend
   * is income, a fee an expense. A new line is opened on a first purchase.
   */
  async recordOperation(
    input: OperationInput,
    meta: { captureText?: string } = {},
    client?: TransactionClientContract
  ): Promise<{ operation: InvestmentOperation; holding: Holding; cashAfterCents: number }> {
    const run = async (trx: TransactionClientContract) => {
      const account = await Account.findOrFail(input.accountId, { client: trx })
      const holding = await this.holdingFor(account, input, trx)
      const operations = await InvestmentOperation.query({ client: trx }).where(
        'holding_id',
        holding.id
      )

      const operation = new InvestmentOperation().useTransaction(trx)
      operation.merge({
        holdingId: holding.id,
        kind: input.kind,
        occurredOn: fromIsoDate(input.occurredOn),
        feesCents: 0,
        captureText: meta.captureText ?? null,
      })
      let label: string
      if (input.kind === 'buy' || input.kind === 'sell') {
        const quantity = input.quantity ?? 0
        const unitPrice = input.unitPrice ?? 0
        if (!(quantity > 0)) invalid('quantity', 'Indiquez une quantité.')
        if (!(unitPrice > 0)) invalid('unitPrice', 'Indiquez le prix d’une unité.')
        const fees = Math.max(0, input.feesCents ?? 0)
        const amount = tradeAmountCents(input.kind, quantity, unitPrice, fees)
        if (amount < 0) invalid('fees', 'Les frais dépassent le montant de la vente.')
        operation.merge({ quantity, unitPrice, feesCents: fees, amountCents: amount })
        label = `${input.kind === 'buy' ? 'Achat' : 'Vente'} ${quantityLabel(quantity)} ${holding.name}`
      } else {
        const amount = Math.abs(input.amountCents ?? 0)
        if (amount === 0) invalid('amount', 'Indiquez le montant.')
        operation.merge({ quantity: null, unitPrice: null, amountCents: amount })
        label = `${input.kind === 'dividend' ? 'Dividende' : 'Frais'} ${holding.name}`
      }

      if (
        operation.kind === 'sell' &&
        oversold([...operations.map(this.toOperation), this.toOperation(operation)])
      ) {
        invalid('quantity', 'Vous vendez plus que vous ne déteniez à cette date.')
      }
      await operation.save()
      await this.recordMoney(operation, account.id, label, trx, meta)
      const cash = await this.cashOf(account.id, trx)
      return { operation, holding, cashAfterCents: cash }
    }
    return client ? run(client) : db.transaction(run)
  }

  /** Cancels an operation and its money; refused when a later sale would oversell. */
  async deleteOperation(id: number, client?: TransactionClientContract) {
    const run = async (trx: TransactionClientContract) => {
      const operation = await InvestmentOperation.findOrFail(id, { client: trx })
      const others = await InvestmentOperation.query({ client: trx })
        .where('holding_id', operation.holdingId)
        .whereNot('id', id)
      if (oversold(others.map(this.toOperation))) {
        throw new errors.E_VALIDATION_ERROR([
          {
            field: 'operation',
            message: 'Une vente plus récente dépasserait alors ce qui était détenu.',
            rule: 'portfolio',
          },
        ])
      }
      await this.transactions.deleteForSource(sourceOf(operation.kind), operation.id, trx)
      await operation.delete()
      return operation
    }
    return client ? run(client) : db.transaction(run)
  }

  async updateHolding(id: number, input: HoldingInput): Promise<Holding> {
    const holding = await Holding.findOrFail(id)
    const priceChanged = input.manualPrice !== holding.manualPrice
    holding.merge({
      name: input.name,
      assetClass: input.assetClass,
      notes: input.notes,
      manualPrice: input.manualPrice,
      manualPricedOn:
        input.manualPrice === null ? null : priceChanged ? today() : holding.manualPricedOn,
    })
    await holding.save()
    return holding
  }

  /** Deletes a line with its operations and their money. */
  async deleteHolding(id: number): Promise<Holding> {
    return db.transaction(async (trx) => {
      const holding = await Holding.findOrFail(id, { client: trx })
      const operations = await InvestmentOperation.query({ client: trx }).where('holding_id', id)
      for (const operation of operations) {
        await this.transactions.deleteForSource(sourceOf(operation.kind), operation.id, trx)
      }
      await holding.delete()
      return holding
    })
  }

  /** The operations of an account, or of one line, newest first. */
  async operations(filter: { accountId?: number; holdingId?: number }): Promise<OperationRow[]> {
    const query = InvestmentOperation.query()
      .preload('holding')
      .orderBy('occurred_on', 'desc')
      .orderBy('id', 'desc')
    if (filter.holdingId) query.where('holding_id', filter.holdingId)
    if (filter.accountId) {
      query.whereHas('holding', (holding) => holding.where('account_id', filter.accountId!))
    }
    const rows = await query
    return rows.map((operation) => ({
      id: operation.id,
      holdingId: operation.holdingId,
      holdingName: operation.holding.name,
      kind: operation.kind,
      occurredOn: toIsoDate(operation.occurredOn),
      quantity: operation.quantity,
      unitPrice: operation.unitPrice,
      feesCents: operation.feesCents,
      amountCents: operation.amountCents,
    }))
  }

  /** The lines of an account, for a form's choice. */
  async holdingsOf(
    accountId: number
  ): Promise<Array<{ id: number; name: string; symbol: string | null }>> {
    const holdings = await Holding.query().where('account_id', accountId).orderBy('name')
    return holdings.map(({ id, name, symbol }) => ({ id, name, symbol }))
  }

  private async holdingFor(
    account: Account,
    input: OperationInput,
    trx: TransactionClientContract
  ): Promise<Holding> {
    if (input.holdingId) {
      const holding = await Holding.query({ client: trx })
        .where('id', input.holdingId)
        .where('account_id', account.id)
        .first()
      if (!holding) invalid('holdingId', 'Cette ligne n’est pas sur ce compte.')
      return holding
    }
    const symbol = input.symbol?.trim().toUpperCase() || null
    const name = input.name?.trim() || null
    if (!symbol && !name) invalid('holdingId', 'Choisissez une ligne ou indiquez un symbole.')

    const existing = symbol
      ? await Holding.query({ client: trx })
          .where('account_id', account.id)
          .where('symbol', symbol)
          .first()
      : await Holding.query({ client: trx })
          .where('account_id', account.id)
          .whereILike('name', name!)
          .first()
    if (existing) return existing
    if (input.kind !== 'buy') {
      invalid('holdingId', 'Cette ligne n’existe pas encore : commencez par un achat.')
    }
    const holding = new Holding().useTransaction(trx)
    holding.merge({
      accountId: account.id,
      symbol,
      name: name ?? MARKET_NAMES[symbol!] ?? symbol!,
      assetClass: input.assetClass ?? (symbol && /-(EUR|USD)$/.test(symbol) ? 'crypto' : 'stock'),
    })
    await holding.save()
    return holding
  }

  private async recordMoney(
    operation: InvestmentOperation,
    accountId: number,
    label: string,
    trx: TransactionClientContract,
    meta: { captureText?: string }
  ) {
    const occurredOn = toIsoDate(operation.occurredOn)
    switch (operation.kind) {
      case 'buy':
      case 'sell':
        await this.transactions.recordTrade(
          {
            accountId,
            amountCents: operation.kind === 'buy' ? -operation.amountCents : operation.amountCents,
            label,
            occurredOn,
          },
          operation.id,
          trx,
          meta
        )
        break
      case 'dividend':
        await this.transactions.recordIncome(
          { amountCents: operation.amountCents, label, occurredOn, accountId },
          trx,
          { ...meta, sourceType: DIVIDEND_SOURCE, sourceId: operation.id }
        )
        break
      case 'fee':
        await this.transactions.recordExpense(
          { amountCents: operation.amountCents, label, occurredOn, accountId, envelopeId: null },
          trx,
          { ...meta, sourceType: FEE_SOURCE, sourceId: operation.id }
        )
        break
    }
  }

  private toOperation(operation: InvestmentOperation): Operation {
    return {
      kind: operation.kind,
      occurredOn: toIsoDate(operation.occurredOn),
      quantity: operation.quantity,
      unitPrice: operation.unitPrice,
      feesCents: operation.feesCents,
      amountCents: operation.amountCents,
    }
  }

  /* ------------------------------------------------------------------ */
  /* Valuation                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Every investment account valued on `day` (today by default), the
   * savings accounts beside them, the allocation and the totals.
   */
  async overview(day: string = toIsoDate(today())): Promise<PortfolioOverview> {
    const accounts = await Account.query().orderBy('name')
    const investing = accounts.filter((account) => this.isInvestment(account))
    const saving = accounts.filter(
      (account) =>
        !this.isInvestment(account) && (account.type === 'savings' || account.wrapper === 'livret')
    )
    const balances = await this.balancesOn(
      [...investing, ...saving].map((account) => account.id),
      day
    )
    const valued = await this.valueAccounts(investing, balances, day)

    const lines = valued.flatMap((account) => account.lines)
    const savings = saving.map((account) => ({
      id: account.id,
      name: account.name,
      balanceCents: balances.get(account.id) ?? account.openingBalanceCents,
    }))
    const byClass = new Map<AssetClass, number>()
    for (const line of lines) {
      byClass.set(line.assetClass, (byClass.get(line.assetClass) ?? 0) + line.valueCents)
    }
    const cash = valued.reduce((total, account) => total + Math.max(0, account.cashCents), 0)
    const savingsTotal = savings.reduce((total, account) => total + account.balanceCents, 0)
    const allocation: AllocationSlice[] = [
      ...[...byClass].map(([key, cents]) => ({ key, label: ASSET_CLASS_LABELS[key], cents })),
      { key: 'cash' as const, label: 'Liquidités', cents: cash },
      { key: 'savings' as const, label: 'Épargne', cents: savingsTotal },
    ]
      .filter((slice) => slice.cents > 0)
      .sort((left, right) => right.cents - left.cents)

    const costCents = lines.reduce((total, line) => total + line.costCents, 0)
    const holdingsCents = lines.reduce((total, line) => total + line.valueCents, 0)
    const latentCents = holdingsCents - costCents
    const ytdLines = lines.filter((line) => line.ytdKnown)
    return {
      day,
      totalCents: valued.reduce((total, account) => total + account.totalCents, 0) + savingsTotal,
      costCents,
      latentCents,
      latentPercent: costCents > 0 ? (latentCents / costCents) * 100 : null,
      dayChangeCents: lines.reduce((total, line) => total + (line.dayChangeCents ?? 0), 0),
      ytdPercent:
        ytdLines.length === 0
          ? null
          : simpleDietz({
              startCents: ytdLines.reduce((total, line) => total + line.yearStartCents, 0),
              endCents: ytdLines.reduce((total, line) => total + line.valueCents, 0),
              incomeCents: ytdLines.reduce((total, line) => total + line.yearIncomeCents, 0),
              flows: ytdLines.flatMap((line) => line.yearFlows),
            }),
      accounts: valued.map(withoutLines),
      savings,
      allocation,
    }
  }

  /** One investment account valued on `day`. */
  async account(id: number, day: string = toIsoDate(today())): Promise<PortfolioAccount> {
    const account = await Account.findOrFail(id)
    const balances = await this.balancesOn([id], day)
    const [valued] = await this.valueAccounts([account], balances, day)
    return withoutLines(valued)
  }

  /** One line valued on `day`, with its operations. */
  async holding(id: number, day: string = toIsoDate(today())): Promise<HoldingDetail> {
    const holding = await Holding.query().where('id', id).preload('account').firstOrFail()
    const account = await this.account(holding.accountId, day)
    const row = account.holdings.find((line) => line.id === id)!
    return {
      ...row,
      account: { id: account.id, name: account.name, wrapper: account.wrapper },
      notes: holding.notes,
      manualPrice: holding.manualPrice,
      manualPricedOn: holding.manualPricedOn ? toIsoDate(holding.manualPricedOn) : null,
      operations: await this.operations({ holdingId: id }),
    }
  }

  /** An account holding shares: of type placement, or under a market wrapper. */
  isInvestment(account: Account): boolean {
    return (
      account.type === 'investment' || (account.wrapper !== null && account.wrapper !== 'livret')
    )
  }

  private async cashOf(accountId: number, trx: TransactionClientContract): Promise<number> {
    const account = await Account.findOrFail(accountId, { client: trx })
    const row = await trx
      .from('transactions')
      .where('account_id', accountId)
      .select(db.raw('coalesce(sum(amount_cents), 0)::int as total'))
      .firstOrFail()
    return account.openingBalanceCents + Number(row.total)
  }

  /** Balance of each account at the end of `day`. */
  private async balancesOn(ids: number[], day: string): Promise<Map<number, number>> {
    const balances = new Map<number, number>()
    if (ids.length === 0) return balances
    const rows = await db
      .from('accounts')
      .whereIn('accounts.id', ids)
      .select('accounts.id')
      .select(
        db.raw(
          `(accounts.opening_balance_cents + coalesce((select sum(t.amount_cents) from transactions t where t.account_id = accounts.id and t.occurred_on <= ?), 0))::int as balance`,
          [day]
        )
      )
    for (const row of rows as Array<{ id: number; balance: number }>) {
      balances.set(Number(row.id), Number(row.balance))
    }
    return balances
  }

  private async valueAccounts(
    accounts: Account[],
    balances: Map<number, number>,
    day: string
  ): Promise<Array<PortfolioAccount & { lines: Valued[] }>> {
    if (accounts.length === 0) return []
    const holdings = await Holding.query()
      .whereIn(
        'account_id',
        accounts.map((account) => account.id)
      )
      .preload('operations')
      .orderBy('name')
    const symbols = holdings.flatMap((holding) => (holding.symbol ? [holding.symbol] : []))
    const charts = await this.quotes.charts(symbols)
    const yearStart = DateTime.fromISO(day).startOf('year').minus({ days: 1 }).toISODate()!
    const currencies = [...charts.values()].map((chart) => chart.currency ?? 'EUR')
    const [rates, startRates] = await Promise.all([
      this.quotes.toEuroRates(currencies, day),
      this.quotes.toEuroRates(currencies, yearStart),
    ])

    return accounts.map((account) => {
      const lines = holdings
        .filter((holding) => holding.accountId === account.id)
        .map((holding) => {
          const chart = holding.symbol ? (charts.get(holding.symbol) ?? null) : null
          const currency = chart?.currency ?? 'EUR'
          return this.valueLine(
            holding,
            chart,
            rates.get(currency) ?? null,
            startRates.get(currency) ?? null,
            day,
            yearStart
          )
        })
        .filter((line) => line.quantity > 0 || line.realizedCents !== 0 || line.dividendsCents > 0)
      const holdingsCents = lines.reduce((total, line) => total + line.valueCents, 0)
      for (const line of lines)
        line.weight = holdingsCents > 0 ? line.valueCents / holdingsCents : 0
      const cashCents = balances.get(account.id) ?? account.openingBalanceCents
      const costCents = lines.reduce((total, line) => total + line.costCents, 0)
      return {
        id: account.id,
        name: account.name,
        institution: account.institution,
        wrapper: account.wrapper,
        openedOn: account.openedOn ? toIsoDate(account.openedOn) : null,
        cashCents,
        holdingsCents,
        totalCents: cashCents + holdingsCents,
        costCents,
        latentCents: holdingsCents - costCents,
        dayChangeCents: lines.reduce((total, line) => total + (line.dayChangeCents ?? 0), 0),
        holdings: lines.map(
          ({ yearStartCents: _a, yearFlows: _b, yearIncomeCents: _c, ytdKnown: _d, ...line }) =>
            line
        ),
        lines,
      }
    })
  }

  private valueLine(
    holding: Holding,
    chart: Chart | null,
    rate: number | null,
    startRate: number | null,
    day: string,
    yearStart: string
  ): Valued {
    const operations = holding.operations
      .map((operation) => this.toOperation(operation))
      .filter((operation) => operation.occurredOn <= day)
    const position = positionOf(operations)
    const averageCost = position.quantity > 0 ? position.costCents / 100 / position.quantity : null

    /** The euro price of a unit on a day: the quote, else the typed value. */
    const priceOn = (on: string, euroRate: number | null) => {
      const quote = chart && euroRate !== null ? closeOn(chart.bars, on) : null
      if (quote) {
        return {
          price: quote.close * euroRate!,
          previous: quote.previous === null ? null : quote.previous * euroRate!,
          day: quote.day,
          source: 'market' as const,
        }
      }
      if (holding.manualPrice !== null) {
        return {
          price: holding.manualPrice,
          previous: null,
          day: holding.manualPricedOn ? toIsoDate(holding.manualPricedOn) : null,
          source: 'manual' as const,
        }
      }
      return null
    }
    const current = priceOn(day, rate)
    const price = current?.price ?? averageCost
    const valueCents = Math.round(position.quantity * (price ?? 0) * 100)
    const latentCents = valueCents - position.costCents

    const stale =
      current?.source === 'market'
        ? current.day! < DateTime.fromISO(day).minus({ days: STALE_QUOTE_DAYS }).toISODate()!
        : current?.source === 'manual'
          ? !current.day ||
            current.day < DateTime.fromISO(day).minus({ days: STALE_MANUAL_DAYS }).toISODate()!
          : position.quantity > 0

    /** Year to date: the line on December 31st, then what went in and out. */
    const start = DateTime.fromISO(yearStart)
    const span = Math.max(1, DateTime.fromISO(day).diff(start, 'days').days)
    const before = positionOf(operations, yearStart)
    const startPrice = before.quantity > 0 ? priceOn(yearStart, startRate) : null
    const yearOps = operations.filter((operation) => operation.occurredOn > yearStart)
    const yearFlows = yearOps
      .filter((operation) => operation.kind === 'buy' || operation.kind === 'sell')
      .map((operation) => ({
        cents: operation.kind === 'buy' ? operation.amountCents : -operation.amountCents,
        weight:
          DateTime.fromISO(day).diff(DateTime.fromISO(operation.occurredOn), 'days').days / span,
      }))
    const yearIncomeCents = yearOps
      .filter((operation) => operation.kind === 'dividend')
      .reduce((total, operation) => total + operation.amountCents, 0)
    const yearStartCents = Math.round(before.quantity * (startPrice?.price ?? 0) * 100)
    /** A value typed by hand says nothing of January 1st: only quotes give a year. */
    const ytdKnown =
      current?.source === 'market' && (before.quantity === 0 || startPrice?.source === 'market')

    return {
      id: holding.id,
      accountId: holding.accountId,
      name: holding.name,
      symbol: holding.symbol,
      assetClass: holding.assetClass,
      quantity: position.quantity,
      averageCost,
      costCents: position.costCents,
      price,
      priceOn: current?.day ?? null,
      priceSource: current?.source ?? 'cost',
      stale,
      valueCents,
      latentCents,
      latentPercent: position.costCents > 0 ? (latentCents / position.costCents) * 100 : null,
      /** Against the close before the last one: the last session's move. */
      dayChangeCents:
        current?.source === 'market' && current.previous !== null
          ? Math.round(position.quantity * (current.price - current.previous) * 100)
          : null,
      ytdPercent: ytdKnown
        ? simpleDietz({
            startCents: yearStartCents,
            endCents: valueCents,
            incomeCents: yearIncomeCents,
            flows: yearFlows,
          })
        : null,
      dividendsCents: position.dividendsCents,
      realizedCents: position.realizedCents,
      weight: 0,
      yearStartCents,
      yearFlows,
      yearIncomeCents,
      ytdKnown,
    }
  }

  /** « 1 234,56 € d’achat » for flash messages. */
  static describe(operation: InvestmentOperation, holding: Holding): string {
    if (operation.kind === 'buy' || operation.kind === 'sell') {
      return `${operation.kind === 'buy' ? 'Achat' : 'Vente'} de ${quantityLabel(operation.quantity ?? 0)} ${holding.name} (${formatAmount(operation.amountCents)})`
    }
    return `${operation.kind === 'dividend' ? 'Dividende' : 'Frais'} ${holding.name} (${formatAmount(operation.amountCents)})`
  }
}
