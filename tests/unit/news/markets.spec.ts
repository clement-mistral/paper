import { test } from '@japa/runner'
import { parseSymbols, quoteOf, rsiOf, signalsOf } from '#domains/news/markets'
import { parseChart, tidyName } from '#domains/budget/market/yahoo'
import type { MarketQuote } from '#shared/types/news'
import { chartOf } from '#tests/helpers/market_chart'

const quote = (closes: number[], type?: string): MarketQuote =>
  quoteOf('EX.PA', parseChart(chartOf(closes, { type }))!, '2026-11-11')!

test.group('News | marchés', () => {
  test('symbols are read in capitals, duplicates and junk out', ({ assert }) => {
    assert.deepEqual(parseSymbols(' mc.pa, AAPL ;btc-eur  MC.PA, <script>'), [
      'MC.PA',
      'AAPL',
      'BTC-EUR',
    ])
    assert.deepEqual(parseSymbols(''), [])
    assert.deepEqual(parseSymbols(null), [])
  })

  test('names lose their legal form, acronyms keep their capitals', ({ assert }) => {
    assert.equal(tidyName('SCHNEIDER ELECTRIC SE'), 'Schneider Electric')
    assert.equal(tidyName('BNP PARIBAS ACT.A'), 'BNP Paribas')
    assert.equal(tidyName('Apple Inc.'), 'Apple')
    assert.equal(tidyName('Bitcoin EUR'), 'Bitcoin')
  })

  test('only sessions closed before the sheet’s day count', ({ assert }) => {
    const chart = parseChart(chartOf([100, 110, 121], { last: '2026-11-12' }))!
    assert.deepEqual(
      chart.bars.map((bar) => bar.day),
      ['2026-11-09', '2026-11-10', '2026-11-11']
    )
    const sheet = quoteOf('EX.PA', chart, '2026-11-11')!
    assert.equal(sheet.price, 110)
    assert.equal(sheet.asOf, '2026-11-10')
    assert.closeTo(sheet.changeDay!, 10, 0.001)
    assert.isNull(quoteOf('EX.PA', chart, '2026-11-10'), 'a single session: nothing to compare')
  })

  test('sessions without a close are skipped', ({ assert }) => {
    const json = chartOf([100, 0, 105])
    json.chart!.result![0].indicators!.quote![0].close = [100, null, 105]
    assert.deepEqual(
      parseChart(json)!.bars.map((bar) => bar.close),
      [100, 105]
    )
    assert.isNull(parseChart({ chart: { result: null } }))
  })

  test('RSI: 100 when it only rises, low when it falls', ({ assert }) => {
    const bars = (closes: number[]) => closes.map((close, index) => ({ day: `${index}`, close }))
    const rising = Array.from({ length: 30 }, (_, index) => 100 + index)
    assert.equal(rsiOf(bars(rising)), 100)
    assert.isBelow(rsiOf(bars([...rising].reverse()))!, 1)
    assert.isNull(rsiOf(bars([1, 2, 3])))
  })

  test('changes over a month and a year, the distance from the high', ({ assert }) => {
    const closes = Array.from({ length: 400 }, (_, index) => (index < 380 ? 100 : 80))
    const figures = quote(closes)
    assert.closeTo(figures.changeMonth!, -20, 0.001)
    assert.closeTo(figures.changeYear!, -20, 0.001)
    assert.closeTo(figures.fromHigh, -20, 0.001)
    assert.equal(figures.aboveMa200, false)
    assert.lengthOf(figures.spark, 60)
    assert.isNull(quote([100, 101, 102]).changeYear, 'too short for a year')
  })

  test('a recent rise of the 50-session average over the 200 one is a golden cross', ({
    assert,
  }) => {
    const closes = [
      ...Array.from({ length: 250 }, () => 100),
      ...Array.from({ length: 150 }, (_, index) => 100 - index * 0.2),
      ...Array.from({ length: 60 }, (_, index) => 70 + index * 1.5),
    ]
    let found: MarketQuote | null = null
    for (let end = 400; end <= closes.length && !found; end++) {
      const figures = quote(closes.slice(0, end))
      if (figures.cross === 'golden') found = figures
    }
    assert.isNotNull(found)
    const [signal] = signalsOf([found!])
    assert.equal(signal.label, 'Croisement haussier')
    assert.equal(signal.tone, 'up')
  })

  test('signals: one line per value, strongest first, quiet values left out', ({ assert }) => {
    const flat = (price: number): MarketQuote => ({
      symbol: `V${price}`,
      name: `Valeur ${price}`,
      kind: 'stock',
      currency: 'EUR',
      price,
      asOf: '2026-11-10',
      changeDay: 0.2,
      changeMonth: 1,
      changeYear: 5,
      fromHigh: -10,
      fromLow: 10,
      aboveMa200: true,
      cross: null,
      rsi: 50,
      spark: [],
    })
    const oversold = { ...flat(1), rsi: 22, changeDay: -5 }
    const high = { ...flat(2), fromHigh: 0, changeYear: 31.5 }
    const crypto = { ...flat(3), kind: 'crypto' as const, changeDay: 5 }
    const signals = signalsOf([flat(0), high, oversold, crypto])
    assert.deepEqual(
      signals.map((signal) => [signal.name, signal.label]),
      [
        ['Valeur 1', 'Survendu'],
        ['Valeur 2', 'Au plus haut sur un an'],
      ]
    )
    assert.equal(signals[1].detail, '+31,5 % sur un an.')
  })
})
