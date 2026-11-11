import { test } from '@japa/runner'
import {
  closeOn,
  type Operation,
  oversold,
  positionOf,
  simpleDietz,
  tradeAmountCents,
} from '#domains/budget/portfolio'

const buy = (
  occurredOn: string,
  quantity: number,
  unitPrice: number,
  feesCents = 0
): Operation => ({
  kind: 'buy',
  occurredOn,
  quantity,
  unitPrice,
  feesCents,
  amountCents: tradeAmountCents('buy', quantity, unitPrice, feesCents),
})
const sell = (
  occurredOn: string,
  quantity: number,
  unitPrice: number,
  feesCents = 0
): Operation => ({
  kind: 'sell',
  occurredOn,
  quantity,
  unitPrice,
  feesCents,
  amountCents: tradeAmountCents('sell', quantity, unitPrice, feesCents),
})

test.group('Budget | portefeuille', () => {
  test('fees are added to a purchase and taken from a sale', ({ assert }) => {
    assert.equal(tradeAmountCents('buy', 3, 401.5, 250), 120_700)
    assert.equal(tradeAmountCents('sell', 3, 401.5, 250), 120_200)
    assert.equal(tradeAmountCents('buy', 0.125, 66_006.78, 0), 825_085)
  })

  test('weighted average cost: a sale releases its share, the average stays', ({ assert }) => {
    const operations = [
      buy('2026-01-10', 10, 100, 1000),
      buy('2026-03-10', 10, 120, 1000),
      sell('2026-06-10', 5, 150, 500),
      {
        kind: 'dividend' as const,
        occurredOn: '2026-05-01',
        quantity: null,
        unitPrice: null,
        feesCents: 0,
        amountCents: 3000,
      },
    ]
    const position = positionOf(operations)
    /** 20 units for 2 220 €: 111 € each; 5 sold at 150 € less 5 € of fees. */
    assert.equal(position.quantity, 15)
    assert.equal(position.costCents, 166_500)
    assert.equal(position.realizedCents, 74_500 - 55_500)
    assert.equal(position.dividendsCents, 3000)

    const before = positionOf(operations, '2026-02-01')
    assert.equal(before.quantity, 10)
    assert.equal(before.costCents, 101_000)
  })

  test('everything sold: nothing held, no cost left', ({ assert }) => {
    const position = positionOf([buy('2026-01-10', 0.3, 10), sell('2026-02-10', 0.3, 12)])
    assert.equal(position.quantity, 0)
    assert.equal(position.costCents, 0)
    assert.equal(position.realizedCents, 60)
  })

  test('a sale of more than was held at its date is caught, in date order', ({ assert }) => {
    assert.isNull(oversold([sell('2026-02-10', 5, 10), buy('2026-01-10', 5, 10)]))
    const early = sell('2026-01-05', 1, 10)
    assert.equal(oversold([buy('2026-01-10', 5, 10), early]), early)
  })

  test('the last close on or before a day, with the one before', ({ assert }) => {
    const bars = [
      { day: '2026-11-06', close: 10 },
      { day: '2026-11-09', close: 11 },
      { day: '2026-11-10', close: 12 },
    ]
    assert.deepEqual(closeOn(bars, '2026-11-08'), { close: 10, day: '2026-11-06', previous: null })
    assert.deepEqual(closeOn(bars, '2026-11-11'), { close: 12, day: '2026-11-10', previous: 11 })
    assert.isNull(closeOn(bars, '2026-11-01'))
  })

  test('simple Dietz: money put in midway is not counted as a gain', ({ assert }) => {
    /** 1 000 € at the start, 1 000 € more halfway, 2 100 € at the end. */
    const result = simpleDietz({
      startCents: 100_000,
      endCents: 210_000,
      incomeCents: 0,
      flows: [{ cents: 100_000, weight: 0.5 }],
    })
    assert.closeTo(result!, (10_000 / 150_000) * 100, 1e-9)
    assert.isNull(simpleDietz({ startCents: 0, endCents: 0, incomeCents: 0, flows: [] }))
  })
})
