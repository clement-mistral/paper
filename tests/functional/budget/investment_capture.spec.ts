import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import CaptureService from '#capture/capture_service'
import UndoService from '#capture/services/undo_service'
import InvestmentOperation from '#domains/budget/models/investment_operation'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import InvestmentCalendarService from '#domains/budget/services/investment_calendar_service'
import PortfolioService from '#domains/budget/services/portfolio_service'
import QuoteService from '#domains/budget/services/quote_service'
import AgendaView from '#views/agenda_view'
import { toIsoDate, today } from '#support/dates'
import { FixtureQuotes } from '#tests/helpers/market_chart'

const day = (offset: number) => toIsoDate(today().plus({ days: offset }))

async function setup(cleanup: (fn: () => void) => void) {
  const quotes = new FixtureQuotes(
    { 'MC.PA': { closes: Array.from({ length: 400 }, () => 600) } },
    day(1)
  )
  app.container.swap(QuoteService, () => quotes)
  cleanup(() => app.container.restore(QuoteService))
  const accounts = await app.container.make(AccountService)
  await accounts.create({ name: 'Compte courant', type: 'checking', isDefault: true })
  const pea = await accounts.create({
    name: 'PEA',
    type: 'investment',
    wrapper: 'pea',
    openingBalance: 500_000,
  })
  const portfolio = await app.container.make(PortfolioService)
  const { holding } = await portfolio.recordOperation({
    accountId: pea.id,
    symbol: 'MC.PA',
    kind: 'buy',
    occurredOn: day(-30),
    quantity: 2,
    unitPrice: 600,
  })
  return { pea, holding, capture: await app.container.make(CaptureService) }
}

test.group('Capture | investment operations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a purchase of a line held, then undone', async ({ assert, cleanup }) => {
    const { pea, holding, capture } = await setup(cleanup)
    const preview = await capture.preview({ text: 'achat 3 LVMH à 610 €' })
    assert.equal(preview.status, 'ready')
    if (preview.status !== 'ready') return
    assert.equal(preview.intent.name, 'investment')
    assert.match(preview.effects[0].title, /Achat de 3 LVMH à 610,00/)
    assert.match(preview.effects[1].title, /Liquidités de PEA/)

    const receipt = await capture.commit({ text: 'achat 3 LVMH à 610 €' })
    const operations = await InvestmentOperation.query().where('holding_id', holding.id)
    assert.lengthOf(operations, 2)
    const trade = await Transaction.query()
      .where('account_id', pea.id)
      .where('source_type', 'investment_trade')
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(trade.amountCents, -183_000)

    const undo = await app.container.make(UndoService)
    await undo.undo(receipt.id)
    assert.lengthOf(await InvestmentOperation.query().where('holding_id', holding.id), 1)
  })

  test('a dividend is income; selling a bike stays an income', async ({ assert, cleanup }) => {
    const { pea, capture } = await setup(cleanup)
    await capture.commit({ text: 'dividende 12,40 € LVMH' })
    const dividend = await Transaction.query()
      .where('account_id', pea.id)
      .where('amount_cents', 1240)
      .firstOrFail()
    assert.isNotNull(dividend.sourceType)

    const bike = await capture.preview({ text: 'vendu le vélo 80 €' })
    assert.equal(bike.status === 'ready' && bike.intent.name, 'income')
  })

  test('plans and the 5 years of a PEA show in the Agenda', async ({ assert, cleanup }) => {
    const { pea, holding } = await setup(cleanup)
    const accounts = await app.container.make(AccountService)
    await accounts.update(pea.id, {
      name: 'PEA',
      type: 'investment',
      wrapper: 'pea',
      openedOn: toIsoDate(today().plus({ days: 3 }).minus({ years: 5 })),
      openingBalance: 5000,
    })
    const calendar = await app.container.make(InvestmentCalendarService)
    const dayOfMonth = Math.min(today().plus({ days: 2 }).day, 28)
    await calendar.createPlan({
      accountId: pea.id,
      holdingId: holding.id,
      amountCents: 15_000,
      dayOfMonth,
    })

    const agenda = await app.container.make(AgendaView)
    const items = await agenda.items(today(), today().plus({ days: 40 }))
    const milestone = items.find((item) => item.kind === 'milestone')
    assert.equal(milestone?.date, day(3))
    assert.match(milestone!.title, /Les 5 ans du PEA « PEA »/)
    const plan = items.find((item) => item.kind === 'investment_plan')
    assert.match(plan!.detail ?? '', /150,00\s€ · LVMH/)
  })
})
