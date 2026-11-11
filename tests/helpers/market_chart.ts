import { DateTime } from 'luxon'
import type { ChartJson } from '#domains/budget/market/yahoo'
import QuoteService from '#domains/budget/services/quote_service'

/** A Yahoo chart of one close a day at 9h Paris, ending the day before `last`. */
export function chartOf(
  closes: number[],
  options: { last?: string; type?: string; name?: string; currency?: string } = {}
): ChartJson {
  const end = DateTime.fromISO(options.last ?? '2026-11-11', { zone: 'Europe/Paris' }).set({
    hour: 9,
  })
  return {
    chart: {
      result: [
        {
          meta: {
            currency: options.currency ?? 'EUR',
            instrumentType: options.type ?? 'EQUITY',
            shortName: options.name ?? 'EXEMPLE SA',
          },
          timestamp: closes.map((_, index) =>
            Math.floor(end.minus({ days: closes.length - index }).toSeconds())
          ),
          indicators: { quote: [{ close: closes }] },
        },
      ],
    },
  }
}

export type Series = Record<
  string,
  { closes: number[]; type?: string; currency?: string; name?: string }
>

/**
 * Yahoo Finance answering from fixtures: the closes of each symbol, the
 * series ending the day before `last` (today by default). Unknown
 * symbols get no answer. Counts what it was asked.
 */
export class FixtureQuotes extends QuoteService {
  asked: string[] = []

  constructor(
    private series: Series,
    private last?: string
  ) {
    super()
  }

  protected async download(symbol: string) {
    this.asked.push(symbol)
    const entry = this.series[symbol]
    if (!entry) return null
    return chartOf(entry.closes, { last: this.last, ...entry })
  }
}
