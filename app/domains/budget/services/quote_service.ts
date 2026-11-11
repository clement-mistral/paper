import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { fetchPublicText } from '#support/safe_fetch'
import MarketInstrument from '#domains/budget/models/market_instrument'
import { closeOn } from '#domains/budget/portfolio'
import { type Chart, type ChartJson, parseChart } from '#domains/budget/market/yahoo'

/** A value is asked again after an hour. */
const FRESH_MS = 60 * 60 * 1000
/** With recent closes in store, a month back is enough to catch up. */
const CATCH_UP_DAYS = 20
/** Requests at once to Yahoo Finance, which slows down crowds. */
const CONCURRENCY = 4

/**
 * Daily closes of quoted values, from Yahoo Finance's public chart (no
 * key), kept in `price_quotes` so that a portfolio can be valued on any
 * past day, even offline. Public service of the Budget domain: the
 * newspaper's « Marchés » page reads its closes here too.
 */
export default class QuoteService {
  /**
   * The closes of each symbol, oldest first, after asking Yahoo for the
   * ones not refreshed within the hour. A symbol never answered is left
   * out of the map.
   */
  async charts(symbols: string[]): Promise<Map<string, Chart>> {
    const wanted = [...new Set(symbols)]
    if (wanted.length === 0) return new Map()
    await this.refresh(wanted)

    const [instruments, rows] = await Promise.all([
      MarketInstrument.query().whereIn('symbol', wanted),
      db
        .from('price_quotes')
        .whereIn('symbol', wanted)
        .orderBy('day')
        .select('symbol', 'close', db.raw(`to_char(day, 'YYYY-MM-DD') as day`)),
    ])
    const bars = new Map<string, Chart['bars']>()
    for (const row of rows as Array<{ symbol: string; day: string; close: string }>) {
      const list = bars.get(row.symbol) ?? []
      list.push({ day: row.day, close: Number(row.close) })
      bars.set(row.symbol, list)
    }
    const charts = new Map<string, Chart>()
    for (const instrument of instruments) {
      const list = bars.get(instrument.symbol)
      if (!list || list.length === 0) continue
      charts.set(instrument.symbol, {
        bars: list,
        name: instrument.name,
        currency: instrument.currency,
        kind: instrument.kind,
      })
    }
    return charts
  }

  /**
   * Euros for one unit of `currency` on `day` (last known rate), from the
   * « EURXXX=X » rates; 1 for the euro, null when unknown. Pence (GBp)
   * are hundredths of a pound.
   */
  async toEuroRates(currencies: string[], day: string): Promise<Map<string, number | null>> {
    const rates = new Map<string, number | null>()
    const foreign = [...new Set(currencies.map((currency) => this.base(currency).currency))].filter(
      (currency) => currency !== 'EUR'
    )
    const charts = await this.charts(foreign.map((currency) => `EUR${currency}=X`))
    for (const currency of currencies) {
      const { currency: base, divisor } = this.base(currency)
      if (base === 'EUR') {
        rates.set(currency, 1 / divisor)
        continue
      }
      const chart = charts.get(`EUR${base}=X`)
      const rate = chart ? closeOn(chart.bars, day)?.close : undefined
      rates.set(currency, rate ? 1 / rate / divisor : null)
    }
    return rates
  }

  private base(currency: string): { currency: string; divisor: number } {
    if (currency === 'GBp' || currency === 'GBX') return { currency: 'GBP', divisor: 100 }
    if (currency === 'ZAc') return { currency: 'ZAR', divisor: 100 }
    return { currency: currency.toUpperCase(), divisor: 1 }
  }

  /** Asks Yahoo for the symbols not refreshed within the hour. */
  private async refresh(symbols: string[]) {
    const known = await MarketInstrument.query().whereIn('symbol', symbols)
    const bySymbol = new Map(known.map((instrument) => [instrument.symbol, instrument]))
    const limit = DateTime.now().minus({ milliseconds: FRESH_MS })
    const queue = symbols.filter((symbol) => {
      const fetchedAt = bySymbol.get(symbol)?.fetchedAt
      return !fetchedAt || fetchedAt < limit
    })
    const worker = async () => {
      for (let symbol = queue.shift(); symbol !== undefined; symbol = queue.shift()) {
        await this.refreshOne(symbol, bySymbol.get(symbol) ?? null)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  }

  private async refreshOne(symbol: string, instrument: MarketInstrument | null) {
    /** Closes stored lately: a month catches up; else (new, or failing) two years. */
    const recent =
      instrument?.lastError === null &&
      instrument.fetchedAt !== null &&
      instrument.fetchedAt > DateTime.now().minus({ days: CATCH_UP_DAYS })
    let chart: Chart | null = null
    let failure: string | null = null
    try {
      const json = await this.download(symbol, recent ? '1mo' : '2y')
      chart = json ? parseChart(json) : null
      if (!chart) failure = 'Valeur inconnue de Yahoo Finance'
    } catch (error) {
      failure = error instanceof Error ? error.message : 'Yahoo Finance injoignable'
    }
    /**
     * Upserts: two pages may ask for the same value at once. A failure is
     * remembered too, so that an unknown symbol is not asked every time.
     */
    const now = new Date()
    if (!chart) {
      await db
        .table('market_instruments')
        .insert({
          symbol,
          kind: 'stock',
          fetched_at: now,
          last_error: failure,
          created_at: now,
          updated_at: now,
        })
        .onConflict('symbol')
        .merge(['fetched_at', 'last_error', 'updated_at'])
      return
    }
    await db.transaction(async (trx) => {
      await trx
        .table('market_instruments')
        .insert({
          symbol,
          name: chart.name,
          kind: chart.kind,
          currency: chart.currency,
          fetched_at: now,
          last_error: null,
          created_at: now,
          updated_at: now,
        })
        .onConflict('symbol')
        .merge(['name', 'kind', 'currency', 'fetched_at', 'last_error', 'updated_at'])
      await trx
        .table('price_quotes')
        .insert(chart.bars.map((bar) => ({ symbol, day: bar.day, close: bar.close })))
        .onConflict(['symbol', 'day'])
        .merge(['close'])
    })
  }

  /** The raw chart; never fetched during tests (no network there). */
  protected async download(symbol: string, range: '1mo' | '2y'): Promise<ChartJson | null> {
    if (app.inTest) return null
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
    )
    url.search = new URLSearchParams({ range, interval: '1d' }).toString()
    const { text } = await fetchPublicText(url.toString(), {
      accept: 'application/json',
      timeoutMs: 6000,
      maxBytes: 400_000,
    })
    return JSON.parse(text) as ChartJson
  }
}
