import { DateTime } from 'luxon'
import { HOME_ZONE } from '#support/dates'
import { type Bar, type Chart, MARKET_NAMES, MARKET_SYMBOL } from '#domains/budget/market/yahoo'
import type { MarketQuote, MarketSignal } from '#shared/types/news'

/**
 * Figures of the « Marchés » page, computed from a year or two of daily
 * closes: the change over a day, a month and a year, the distance from
 * the yearly high, the 50- and 200-session averages and the RSI. The
 * signals are those figures put in words; they describe the price, they
 * never tell what to buy.
 */

/** The indices, rates and commodities printed at the top of the page. */
export const MARKET_INDICES: ReadonlyArray<{ symbol: string; name: string }> = [
  { symbol: '^FCHI', name: 'CAC 40' },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'Nasdaq' },
  { symbol: 'EURUSD=X', name: 'Euro en dollars' },
  { symbol: 'GC=F', name: 'Once d’or ($)' },
]

/**
 * The values followed by default: large French and American companies, a
 * world index fund and the main cryptocurrencies. Yahoo Finance symbols.
 */
export const DEFAULT_MARKET_SYMBOLS = [
  'MC.PA',
  'TTE.PA',
  'AIR.PA',
  'SU.PA',
  'AI.PA',
  'SAN.PA',
  'BNP.PA',
  'OR.PA',
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'CW8.PA',
  'BTC-EUR',
  'ETH-EUR',
  'SOL-EUR',
]

export const MAX_MARKET_SYMBOLS = 24

/** « mc.pa, AAPL ; btc-eur » → ['MC.PA', 'AAPL', 'BTC-EUR'], duplicates out. */
export function parseSymbols(value: string | null | undefined): string[] {
  if (!value) return []
  const symbols = value
    .toUpperCase()
    .split(/[\s,;]+/)
    .filter((symbol) => MARKET_SYMBOL.test(symbol))
  return [...new Set(symbols)].slice(0, MAX_MARKET_SYMBOLS)
}

/** Sessions counted in a month, and points of the printed curve. */
const SPARK_POINTS = 60

function percent(from: number | undefined, to: number): number | null {
  if (from === undefined || from === 0) return null
  return ((to - from) / from) * 100
}

function average(bars: Bar[], end: number, length: number): number | null {
  if (end + 1 < length) return null
  let total = 0
  for (let index = end - length + 1; index <= end; index++) total += bars[index].close
  return total / length
}

/** Wilder's RSI over 14 sessions, ending at the last bar. */
export function rsiOf(bars: Bar[], length = 14): number | null {
  if (bars.length <= length) return null
  let gain = 0
  let loss = 0
  for (let index = 1; index <= length; index++) {
    const change = bars[index].close - bars[index - 1].close
    if (change > 0) gain += change
    else loss -= change
  }
  gain /= length
  loss /= length
  for (let index = length + 1; index < bars.length; index++) {
    const change = bars[index].close - bars[index - 1].close
    gain = (gain * (length - 1) + Math.max(change, 0)) / length
    loss = (loss * (length - 1) + Math.max(-change, 0)) / length
  }
  if (loss === 0) return 100
  return 100 - 100 / (1 + gain / loss)
}

/** The last close on or before `day`, by its index. */
function indexOn(bars: Bar[], day: string): number {
  for (let index = bars.length - 1; index >= 0; index--) if (bars[index].day <= day) return index
  return -1
}

/**
 * The figures of a value for the sheet of `day`: only the sessions
 * closed before that day count, so that a sheet prints the same twice
 * and an older sheet shows the market of its time.
 */
export function quoteOf(
  symbol: string,
  chart: Chart,
  day: string,
  name?: string
): MarketQuote | null {
  const sheet = DateTime.fromISO(day, { zone: HOME_ZONE })
  const bars = chart.bars.filter((bar) => bar.day < day)
  if (bars.length < 2) return null
  const last = bars.length - 1
  const close = bars[last].close
  const at = (days: number) => {
    const index = indexOn(bars, sheet.minus({ days }).toISODate()!)
    return index >= 0 ? bars[index].close : undefined
  }
  const yearAgo = sheet.minus({ years: 1 }).toISODate()!
  const year = bars.filter((bar) => bar.day > yearAgo)
  const high = Math.max(...year.map((bar) => bar.close))
  const low = Math.min(...year.map((bar) => bar.close))

  const ma50 = average(bars, last, 50)
  const ma200 = average(bars, last, 200)
  /** The averages five sessions back, to tell a crossing. */
  const before50 = average(bars, last - 5, 50)
  const before200 = average(bars, last - 5, 200)
  let cross: MarketQuote['cross'] = null
  if (ma50 !== null && ma200 !== null && before50 !== null && before200 !== null) {
    if (before50 <= before200 && ma50 > ma200) cross = 'golden'
    if (before50 >= before200 && ma50 < ma200) cross = 'death'
  }

  return {
    symbol,
    name: name ?? MARKET_NAMES[symbol] ?? chart.name ?? symbol,
    kind: chart.kind,
    currency: chart.currency,
    price: close,
    asOf: bars[last].day,
    changeDay: percent(bars[last - 1].close, close),
    changeMonth: percent(at(30), close),
    changeYear: year.length >= 200 ? percent(at(365), close) : null,
    fromHigh: percent(high, close) ?? 0,
    fromLow: percent(low, close) ?? 0,
    aboveMa200: ma200 === null ? null : close > ma200,
    cross,
    rsi: rsiOf(bars.slice(-120)),
    spark: bars.slice(-SPARK_POINTS).map((bar) => Number(bar.close.toPrecision(6))),
  }
}

const fixed = (value: number) => Math.abs(value).toFixed(1).replace('.', ',')

/**
 * What stands out among the followed values, strongest first: a crossing
 * of the averages, an RSI past 70 or under 30, a yearly high, a deep fall
 * from it, a large move of the day. One line per value at most.
 */
export function signalsOf(quotes: MarketQuote[], limit = 6): MarketSignal[] {
  const found: Array<MarketSignal & { strength: number }> = []
  for (const quote of quotes) {
    const candidates: Array<MarketSignal & { strength: number }> = []
    const base = { symbol: quote.symbol, name: quote.name }
    const bigMove = quote.kind === 'crypto' ? 6 : 3.5
    if (quote.cross === 'golden') {
      candidates.push({
        ...base,
        tone: 'up',
        label: 'Croisement haussier',
        detail: 'La moyenne 50 séances repasse au-dessus de la moyenne 200 séances.',
        strength: 90,
      })
    }
    if (quote.cross === 'death') {
      candidates.push({
        ...base,
        tone: 'down',
        label: 'Croisement baissier',
        detail: 'La moyenne 50 séances passe sous la moyenne 200 séances.',
        strength: 88,
      })
    }
    if (quote.rsi !== null && quote.rsi <= 30) {
      candidates.push({
        ...base,
        tone: 'up',
        label: 'Survendu',
        detail: `RSI à ${Math.round(quote.rsi)} : forte baisse en peu de temps, un rebond technique est souvent guetté.`,
        strength: 80 + Math.min(30 - quote.rsi, 8),
      })
    }
    if (quote.rsi !== null && quote.rsi >= 70) {
      candidates.push({
        ...base,
        tone: 'down',
        label: 'Suracheté',
        detail: `RSI à ${Math.round(quote.rsi)} : forte hausse en peu de temps, une pause est souvent guettée.`,
        strength: 75 + Math.min(quote.rsi - 70, 10),
      })
    }
    if (quote.fromHigh >= -1.5) {
      candidates.push({
        ...base,
        tone: 'up',
        label: 'Au plus haut sur un an',
        detail:
          quote.changeYear !== null
            ? `${quote.changeYear >= 0 ? '+' : '−'}${fixed(quote.changeYear)} % sur un an.`
            : 'Il touche son sommet des douze derniers mois.',
        strength: 70,
      })
    }
    if (quote.fromHigh <= -30) {
      candidates.push({
        ...base,
        tone: 'down',
        label: 'Loin de son plus haut',
        detail: `À −${fixed(quote.fromHigh)} % de son sommet annuel${quote.aboveMa200 === false ? ', sous sa moyenne 200 séances' : ''}.`,
        strength: 50 + Math.min(-quote.fromHigh - 30, 20),
      })
    }
    if (quote.changeDay !== null && Math.abs(quote.changeDay) >= bigMove) {
      candidates.push({
        ...base,
        tone: quote.changeDay > 0 ? 'up' : 'down',
        label: quote.changeDay > 0 ? 'Forte hausse' : 'Forte baisse',
        detail: `${quote.changeDay > 0 ? '+' : '−'}${fixed(quote.changeDay)} % à la dernière séance.`,
        strength: 60 + Math.min(Math.abs(quote.changeDay) - bigMove, 20),
      })
    }
    const strongest = candidates.sort((left, right) => right.strength - left.strength)[0]
    if (strongest) found.push(strongest)
  }
  return found
    .sort((left, right) => right.strength - left.strength)
    .slice(0, limit)
    .map(({ strength: _strength, ...signal }) => signal)
}
