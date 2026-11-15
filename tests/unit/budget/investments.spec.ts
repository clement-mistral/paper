import { test } from '@japa/runner'
import { parseInvestment, type Catalog } from '#capture/intents/investment_intent'
import { milestoneOf, planDays } from '#domains/budget/milestones'

const catalog: Catalog = {
  accounts: [
    { id: 1, name: 'PEA Boursorama', wrapper: 'pea' },
    { id: 2, name: 'Ledger', wrapper: 'crypto' },
  ],
  holdings: [
    { id: 10, name: 'Amundi MSCI World', symbol: 'CW8.PA', accountId: 1 },
    { id: 11, name: 'LVMH', symbol: 'MC.PA', accountId: 1 },
    { id: 20, name: 'Bitcoin', symbol: 'BTC-EUR', accountId: 2 },
  ],
}

test.group('Capture | investment operations', () => {
  test('a purchase of a line held, by ticker, with a unit price', ({ assert }) => {
    assert.deepEqual(parseInvestment('achat 10 CW8 à 512,30 €', catalog), {
      kind: 'buy',
      holdingId: 10,
      symbol: null,
      accountId: 1,
      quantity: 10,
      unitPrice: 512.3,
      amountCents: null,
    })
  })

  test('a sale typed with its total gets its unit price', ({ assert }) => {
    const parsed = parseInvestment('vendu 0,5 bitcoin 30 000 €', catalog)
    assert.include(parsed, { kind: 'sell', holdingId: 20, accountId: 2, quantity: 0.5 })
    assert.equal(parsed.unitPrice, 60_000)
  })

  test('a dividend by the name of the line', ({ assert }) => {
    assert.include(parseInvestment('dividende 12,40 € LVMH', catalog), {
      kind: 'dividend',
      holdingId: 11,
      accountId: 1,
      quantity: null,
      amountCents: 1240,
    })
  })

  test('a new ticker goes to the account named by its wrapper', ({ assert }) => {
    assert.include(parseInvestment('acheté 3 AIR.PA à 150 € sur le PEA', catalog), {
      kind: 'buy',
      holdingId: null,
      symbol: 'AIR.PA',
      accountId: 1,
      quantity: 3,
      unitPrice: 150,
    })
  })

  test('selling a bike is not an investment', ({ assert }) => {
    const parsed = parseInvestment('vendu le vélo 80 €', catalog)
    assert.isNull(parsed.holdingId)
    assert.isNull(parsed.symbol)
  })
})

test.group('Budget | investment dates', () => {
  test('5 years of a PEA, 8 of an assurance-vie, nothing for a CTO', ({ assert }) => {
    const account = (wrapper: 'pea' | 'assurance_vie' | 'cto', openedOn: string | null) => ({
      id: 1,
      name: 'Mon compte',
      wrapper,
      openedOn,
    })
    assert.equal(milestoneOf(account('pea', '2021-03-15'))?.date, '2026-03-15')
    assert.match(milestoneOf(account('pea', '2021-03-15'))!.title, /5 ans du PEA « Mon compte »/)
    assert.equal(milestoneOf(account('assurance_vie', '2020-02-29'))?.date, '2028-02-29')
    assert.equal(milestoneOf(account('pea', '2020-02-29'))?.date, '2025-02-28')
    assert.isNull(milestoneOf(account('cto', '2021-03-15')))
    assert.isNull(milestoneOf(account('pea', null)))
  })

  test('a monthly plan falls on its day, from its start', ({ assert }) => {
    const plan = { dayOfMonth: 5, startsOn: '2026-11-10' }
    assert.deepEqual(planDays(plan, '2026-11-01', '2027-01-31'), ['2026-12-05', '2027-01-05'])
    assert.deepEqual(
      planDays({ dayOfMonth: 28, startsOn: '2026-01-01' }, '2026-02-01', '2026-02-28'),
      ['2026-02-28']
    )
  })
})
