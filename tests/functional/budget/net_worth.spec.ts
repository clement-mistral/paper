import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Vehicle from '#domains/auto/models/vehicle'
import AccountService from '#domains/budget/services/account_service'
import PortfolioService from '#domains/budget/services/portfolio_service'
import QuoteService from '#domains/budget/services/quote_service'
import TransactionService from '#domains/budget/services/transaction_service'
import NetWorthView from '#views/net_worth_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import { FixtureQuotes } from '#tests/helpers/market_chart'
import type { NetWorthHistory } from '#shared/types/budget'

const day = (offset: number) => toIsoDate(today().plus({ days: offset }))

test.group('Budget | net worth', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('accounts, savings, investments at their close and vehicles', async ({
    assert,
    cleanup,
  }) => {
    const quotes = new FixtureQuotes(
      { 'MC.PA': { closes: [...Array.from({ length: 398 }, () => 400), 400, 500] } },
      day(1)
    )
    app.container.swap(QuoteService, () => quotes)
    cleanup(() => app.container.restore(QuoteService))

    const accounts = await app.container.make(AccountService)
    const transactions = await app.container.make(TransactionService)
    const portfolio = await app.container.make(PortfolioService)
    const current = await accounts.create({
      name: 'Compte courant',
      type: 'checking',
      openingBalance: 1_000_000,
    })
    const pea = await accounts.create({ name: 'PEA', type: 'investment', wrapper: 'pea' })
    await accounts.create({ name: 'Livret A', type: 'savings', openingBalance: 200_000 })
    await Vehicle.create({
      name: 'Clio',
      fuel: 'sp95',
      initialOdometerKm: 0,
      estimatedValueCents: 800_000,
    })
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
    await portfolio.recordOperation({
      accountId: pea.id,
      symbol: 'mc.pa',
      kind: 'buy',
      occurredOn: day(-10),
      quantity: 3,
      unitPrice: 400,
      feesCents: 200,
    })

    const view = await app.container.make(NetWorthView)
    const worth = await view.on()
    assert.deepEqual(
      worth.parts.map((part) => [part.key, part.cents]),
      [
        ['current', 500_000],
        ['savings', 200_000],
        // 5 000 € in, 1 202 € spent on 3 shares now worth 500 € each.
        ['investments', 500_000 - 120_200 + 150_000],
        ['vehicles', 800_000],
      ]
    )
    assert.equal(worth.totalCents, 500_000 + 200_000 + 529_800 + 800_000)
    assert.isNotNull(worth.monthChangeCents)

    const before = await view.on(day(-30))
    assert.equal(
      before.totalCents,
      1_000_000 + 200_000 + 800_000,
      'before the transfer: the opening balances and the car'
    )

    await User.create({ email: 'worth@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('worth@paper.local', 'secret123')
    const page = await browser.page(urlFor('money'))
    const shown = page.props.netWorth as NetWorthHistory
    assert.equal(shown.totalCents, worth.totalCents)
    assert.equal(shown.history.at(-1)?.cents, worth.totalCents)
    assert.equal(shown.history.at(-1)?.date, day(0))
  })
})
