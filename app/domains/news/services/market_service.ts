import { inject } from '@adonisjs/core'
import QuoteService from '#domains/budget/services/quote_service'
import { MARKET_INDICES, quoteOf, signalsOf } from '#domains/news/markets'
import type { MarketQuote, Markets } from '#shared/types/news'

/**
 * The « Marchés » page of the sheet: the closes come from Budget's quote
 * service (Yahoo Finance, kept in base); a value it cannot give is left
 * out and named on the page.
 */
@inject()
export default class MarketService {
  constructor(private quotes: QuoteService) {}

  /**
   * The page for the sheet of `day`, or null when nothing came back
   * (offline, or no value followed).
   */
  async markets(symbols: string[], day: string): Promise<Omit<Markets, 'page'> | null> {
    if (symbols.length === 0) return null
    const charts = await this.quotes.charts([
      ...MARKET_INDICES.map((index) => index.symbol),
      ...symbols,
    ])

    const indices = MARKET_INDICES.map(({ symbol, name }) => {
      const chart = charts.get(symbol)
      return chart ? quoteOf(symbol, chart, day, name) : null
    }).filter((quote): quote is MarketQuote => quote !== null)
    const followed: MarketQuote[] = []
    const missing: string[] = []
    for (const symbol of symbols) {
      const chart = charts.get(symbol)
      const quote = chart ? quoteOf(symbol, chart, day) : null
      if (quote) followed.push(quote)
      else missing.push(symbol)
    }
    if (followed.length === 0 && indices.length === 0) return null

    const asOf = [...indices, ...followed]
      .map((quote) => quote.asOf)
      .sort()
      .at(-1)!
    return {
      asOf,
      indices,
      stocks: followed.filter((quote) => quote.kind !== 'crypto'),
      cryptos: followed.filter((quote) => quote.kind === 'crypto'),
      signals: signalsOf(followed),
      missing,
    }
  }
}
