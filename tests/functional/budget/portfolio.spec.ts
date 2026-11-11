import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import PortfolioService from '#domains/budget/services/portfolio_service'
import QuoteService from '#domains/budget/services/quote_service'
import TransactionService from '#domains/budget/services/transaction_service'
import MoneyView from '#views/money_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import { FixtureQuotes, type Series } from '#tests/helpers/market_chart'
import { renderPage } from '#tests/helpers/ssr'
import type { HoldingDetail, PortfolioAccount, PortfolioOverview } from '#shared/types/budget'

const day = (offset: number) => toIsoDate(today().plus({ days: offset }))

/** 400 sessions ending today: flat, then the last two closes given. */
function series(flat: number, previous: number, last: number) {
  return [...Array.from({ length: 398 }, () => flat), previous, last]
}

async function useQuotes(values: Series, cleanup: (fn: () => void) => void) {
  const quotes = new FixtureQuotes(values, day(1))
  app.container.swap(QuoteService, () => quotes)
  cleanup(() => app.container.restore(QuoteService))
  return quotes
}

async function setup() {
  const accounts = await app.container.make(AccountService)
  const current = await accounts.create({
    name: 'Compte courant',
    type: 'checking',
    openingBalance: 1_000_000,
    isDefault: true,
  })
  const pea = await accounts.create({
    name: 'PEA Boursorama',
    type: 'investment',
    wrapper: 'pea',
    openedOn: '2021-03-15',
  })
  return {
    accounts,
    current,
    pea,
    portfolio: await app.container.make(PortfolioService),
    transactions: await app.container.make(TransactionService),
  }
}

test.group('Budget | placements', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('trades move the cash without being spent, dividends and fees are real money', async ({
    assert,
    cleanup,
  }) => {
    await useQuotes({}, cleanup)
    const { accounts, current, pea, portfolio, transactions } = await setup()
    await db.transaction((trx) =>
      transactions.transfer(
        {
          fromAccountId: current.id,
          toAccountId: pea.id,
          amountCents: 500_000,
          occurredOn: day(-20),
        },
        trx
      )
    )

    const bought = await portfolio.recordOperation({
      accountId: pea.id,
      symbol: 'mc.pa',
      kind: 'buy',
      occurredOn: day(-10),
      quantity: 3,
      unitPrice: 400,
      feesCents: 200,
    })
    assert.equal(bought.holding.name, 'LVMH', 'named as the French press does')
    assert.equal(bought.holding.symbol, 'MC.PA')
    assert.equal(bought.operation.amountCents, 120_200)
    assert.equal(bought.cashAfterCents, 379_800)

    await portfolio.recordOperation({
      accountId: pea.id,
      holdingId: bought.holding.id,
      kind: 'sell',
      occurredOn: day(-5),
      quantity: 1,
      unitPrice: 450,
      feesCents: 100,
    })
    await portfolio.recordOperation({
      accountId: pea.id,
      holdingId: bought.holding.id,
      kind: 'dividend',
      occurredOn: day(0),
      amountCents: 1500,
    })
    await portfolio.recordOperation({
      accountId: pea.id,
      symbol: 'MC.PA',
      kind: 'fee',
      occurredOn: day(0),
      amountCents: 300,
    })

    assert.equal(await accounts.balance(pea.id), 500_000 - 120_200 + 44_900 + 1500 - 300)
    const money = await app.container.make(MoneyView)
    const overview = await money.overview()
    assert.equal(overview.spentThisMonthCents, 300, 'only the fee is spent')
    assert.equal(overview.incomeThisMonthCents, 1500, 'only the dividend is earned')
    const rows = await Transaction.query().where('account_id', pea.id).orderBy('id')
    assert.deepEqual(
      rows.map((row) => row.sourceType),
      ['transfer', 'investment_trade', 'investment_trade', 'investment_income', 'investment_fee']
    )

    const holding = await portfolio.holding(bought.holding.id)
    assert.equal(holding.quantity, 2)
    assert.equal(holding.costCents, 80_133)
    assert.equal(holding.realizedCents, 44_900 - 40_067)
    assert.equal(holding.dividendsCents, 1500)
    assert.equal(holding.priceSource, 'cost', 'no quote: valued at cost')
    assert.isTrue(holding.stale)
    assert.lengthOf(holding.operations, 4)
  })

  test('what cannot be done is refused, and deleting undoes the money', async ({
    assert,
    cleanup,
  }) => {
    await useQuotes({}, cleanup)
    const { accounts, pea, portfolio } = await setup()
    const first = await portfolio.recordOperation({
      accountId: pea.id,
      symbol: 'AI.PA',
      kind: 'buy',
      occurredOn: day(-10),
      quantity: 5,
      unitPrice: 180,
    })
    const errorOf = async (promise: Promise<unknown>) => {
      try {
        await promise
        return null
      } catch (error) {
        return (error as { messages?: Array<{ field: string }> }).messages?.[0]?.field ?? 'thrown'
      }
    }

    assert.equal(
      await errorOf(
        portfolio.recordOperation({
          accountId: pea.id,
          holdingId: first.holding.id,
          kind: 'sell',
          occurredOn: day(-12),
          quantity: 1,
          unitPrice: 190,
        })
      ),
      'quantity',
      'nothing held yet at that date'
    )
    assert.equal(
      await errorOf(
        portfolio.recordOperation({
          accountId: pea.id,
          symbol: 'SAN.PA',
          kind: 'dividend',
          occurredOn: day(0),
          amountCents: 1000,
        })
      ),
      'holdingId',
      'a new line starts with a purchase'
    )

    const sale = await portfolio.recordOperation({
      accountId: pea.id,
      holdingId: first.holding.id,
      kind: 'sell',
      occurredOn: day(-2),
      quantity: 5,
      unitPrice: 190,
    })
    assert.equal(
      await errorOf(portfolio.deleteOperation(first.operation.id)),
      'operation',
      'the later sale would oversell'
    )
    await portfolio.deleteOperation(sale.operation.id)
    assert.equal(await accounts.balance(pea.id), -90_000)

    await portfolio.deleteHolding(first.holding.id)
    assert.equal(await accounts.balance(pea.id), 0)
    assert.lengthOf(await Transaction.query().where('account_id', pea.id), 0)
  })

  test('valued at the last close, in euros, with the allocation and the year', async ({
    assert,
    cleanup,
  }) => {
    const quotes = await useQuotes(
      {
        'MC.PA': { closes: series(400, 440, 450) },
        'AAPL': { closes: series(200, 200, 200), currency: 'USD' },
        'EURUSD=X': { closes: series(1.25, 1.25, 1.25), type: 'CURRENCY' },
      },
      cleanup
    )
    const { accounts, pea, portfolio } = await setup()
    await accounts.update(pea.id, {
      name: pea.name,
      type: 'investment',
      wrapper: 'pea',
      openedOn: '2021-03-15',
      openingBalance: 100_000,
    })
    const cto = await accounts.create({
      name: 'Compte-titres',
      type: 'checking',
      wrapper: 'cto',
      openingBalance: 150_000,
    })
    const life = await accounts.create({
      name: 'Assurance-vie',
      type: 'investment',
      wrapper: 'assurance_vie',
      openingBalance: 100_000,
    })
    await accounts.create({ name: 'Livret A', type: 'savings', openingBalance: 200_000 })

    const longAgo = day(-380)
    await portfolio.recordOperation({
      accountId: pea.id,
      symbol: 'MC.PA',
      kind: 'buy',
      occurredOn: longAgo,
      quantity: 2,
      unitPrice: 400,
    })
    await portfolio.recordOperation({
      accountId: cto.id,
      symbol: 'AAPL',
      kind: 'buy',
      occurredOn: longAgo,
      quantity: 10,
      unitPrice: 150,
    })
    const euros = await portfolio.recordOperation({
      accountId: life.id,
      name: 'Fonds euros',
      assetClass: 'euro_fund',
      kind: 'buy',
      occurredOn: longAgo,
      quantity: 1,
      unitPrice: 1000,
    })
    await portfolio.updateHolding(euros.holding.id, {
      name: 'Fonds euros',
      assetClass: 'euro_fund',
      manualPrice: 1030,
      notes: null,
    })

    const overview = await portfolio.overview()
    const line = (name: string) =>
      overview.accounts.flatMap((account) => account.holdings).find((row) => row.name === name)!

    const lvmh = line('LVMH')
    assert.equal(lvmh.valueCents, 90_000)
    assert.equal(lvmh.latentCents, 10_000)
    assert.closeTo(lvmh.latentPercent!, 12.5, 1e-9)
    assert.equal(lvmh.dayChangeCents, 2000)
    assert.closeTo(lvmh.ytdPercent!, 12.5, 1e-9)
    assert.equal(lvmh.priceSource, 'market')
    assert.isFalse(lvmh.stale)

    const apple = line('Apple')
    assert.closeTo(apple.price!, 160, 1e-9, 'converted at 1,25 $ for 1 €')
    assert.equal(apple.valueCents, 160_000)

    const fund = line('Fonds euros')
    assert.equal(fund.priceSource, 'manual')
    assert.equal(fund.valueCents, 103_000)
    assert.isFalse(fund.stale)

    assert.deepEqual(
      overview.accounts.map((account) => [account.name, account.cashCents, account.totalCents]),
      [
        ['Assurance-vie', 0, 103_000],
        ['Compte-titres', 0, 160_000],
        ['PEA Boursorama', 20_000, 110_000],
      ],
      'a plain account under a wrapper counts as an investment'
    )
    assert.deepEqual(
      overview.allocation.map((slice) => [slice.key, slice.cents]),
      [
        ['stock', 250_000],
        ['savings', 200_000],
        ['euro_fund', 103_000],
        ['cash', 20_000],
      ]
    )
    assert.equal(overview.totalCents, 573_000)
    assert.equal(overview.latentCents, 10_000 + 10_000 + 3000)
    assert.equal(overview.dayChangeCents, 2000)

    const asked = quotes.asked.length
    await portfolio.overview()
    assert.equal(quotes.asked.length, asked, 'closes kept in base for the hour')
  })

  test('the pages render, the account form takes the wrapper', async ({ assert, cleanup }) => {
    await useQuotes({ 'MC.PA': { closes: series(400, 440, 450) } }, cleanup)
    const { pea, portfolio } = await setup()
    const bought = await portfolio.recordOperation({
      accountId: pea.id,
      symbol: 'MC.PA',
      kind: 'buy',
      occurredOn: day(-3),
      quantity: 2,
      unitPrice: 400,
    })
    await User.create({ email: 'placements@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('placements@paper.local', 'secret123')

    const index = await browser.page(urlFor('portfolios.index'))
    assert.equal(index.component, 'fiches/placements/index')
    assert.equal((index.props.portfolio as PortfolioOverview).totalCents, 90_000 - 80_000)
    const show = await browser.page(urlFor('portfolios.show', { id: pea.id }))
    assert.equal(show.component, 'fiches/placements/show')
    assert.lengthOf((show.props.account as PortfolioAccount).holdings, 1)
    const line = await browser.page(urlFor('portfolios.holdings.show', { id: bought.holding.id }))
    assert.equal((line.props.holding as HoldingDetail).name, 'LVMH')
    for (const page of [index, show, line]) {
      const html = await renderPage(page)
      assert.include(html, 'LVMH')
      assert.notMatch(html, /NaN|Infinity|>undefined</)
    }

    await browser.submit(urlFor('portfolios.operations.store', { id: pea.id }), {
      kind: 'buy',
      holdingId: String(bought.holding.id),
      occurredOn: day(0),
      quantity: '1',
      unitPrice: '450,50',
      fees: '1,50',
    })
    const after = await browser.page(urlFor('portfolios.show', { id: pea.id }))
    assert.equal((after.props.account as PortfolioAccount).holdings[0].quantity, 3)
    assert.equal(
      (after.props.account as PortfolioAccount).cashCents,
      -80_000 - 45_200,
      'flagged, not refused'
    )

    const accounts = await app.container.make(AccountService)
    const cash = await accounts.create({ name: 'Compte courant', type: 'checking' })
    const plain = await browser.request(urlFor('portfolios.show', { id: cash.id }))
    assert.equal(plain.status, 302, 'not an investment account')
    assert.equal(plain.headers.get('location'), urlFor('accounts.show', { id: cash.id }))

    await browser.submit(
      urlFor('accounts.update', { id: cash.id }),
      { name: 'Livret A', type: 'savings', wrapper: 'livret', openedOn: '2019-05-02' },
      'PUT'
    )
    const detail = await accounts.detail(cash.id)
    assert.equal(detail.wrapper, 'livret')
    assert.equal(detail.openedOn, '2019-05-02')
  })
})
