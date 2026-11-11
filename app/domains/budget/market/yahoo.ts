import { DateTime } from 'luxon'
import { HOME_ZONE } from '#support/dates'
import type { MarketKind } from '#shared/types/budget'

/**
 * Yahoo Finance's public chart (no key): what it answers, read into daily
 * closes. Shared by the portfolio (Budget) and the « Marchés » page of
 * the newspaper.
 */

/** A Yahoo Finance symbol: « MC.PA », « AAPL », « BTC-EUR », « ^FCHI ». */
export const MARKET_SYMBOL = /^[A-Z0-9^][A-Z0-9.=^-]{0,19}$/

/** Names of the usual values, written as the French press does. */
export const MARKET_NAMES: Record<string, string> = {
  'MC.PA': 'LVMH',
  'TTE.PA': 'TotalEnergies',
  'AIR.PA': 'Airbus',
  'SU.PA': 'Schneider Electric',
  'AI.PA': 'Air Liquide',
  'SAN.PA': 'Sanofi',
  'BNP.PA': 'BNP Paribas',
  'OR.PA': 'L’Oréal',
  'RMS.PA': 'Hermès',
  'SAF.PA': 'Safran',
  'EL.PA': 'EssilorLuxottica',
  'CS.PA': 'AXA',
  'DG.PA': 'Vinci',
  'KER.PA': 'Kering',
  'RI.PA': 'Pernod Ricard',
  'BN.PA': 'Danone',
  'CAP.PA': 'Capgemini',
  'STLAP.PA': 'Stellantis',
  'RNO.PA': 'Renault',
  'ORA.PA': 'Orange',
  'AAPL': 'Apple',
  'MSFT': 'Microsoft',
  'NVDA': 'Nvidia',
  'AMZN': 'Amazon',
  'GOOGL': 'Alphabet',
  'META': 'Meta',
  'TSLA': 'Tesla',
  'ASML.AS': 'ASML',
  'CW8.PA': 'MSCI World (ETF)',
  'BTC-EUR': 'Bitcoin',
  'ETH-EUR': 'Ether',
  'SOL-EUR': 'Solana',
}

export type ChartJson = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string | null
        symbol?: string
        instrumentType?: string
        shortName?: string
        longName?: string
      }
      timestamp?: number[]
      indicators?: { quote?: Array<{ close?: Array<number | null> }> }
    }> | null
  }
}

/** A day's close: the session's date (Paris) and its last price. */
export type Bar = { day: string; close: number }

/** A value's daily closes, oldest first, and what Yahoo says of it. */
export type Chart = {
  bars: Bar[]
  name: string | null
  currency: string | null
  kind: MarketKind
}

/**
 * « SCHNEIDER ELECTRIC SE » → « Schneider Electric », « Apple Inc. » →
 * « Apple »: the legal forms out, capitals only for the initials.
 */
export function tidyName(raw: string): string {
  const name = raw
    .replace(/\s+(EUR|USD)$/, '')
    .replace(/,?\s+(Inc\.?|Corporation|Corp\.?|SE|SA|S\.A\.|N\.V\.|plc|AG|ACT\.A|ACT\.)$/i, '')
    .trim()
  if (name !== name.toUpperCase()) return name
  /** All capitals: words of five letters or more get small letters, acronyms stay. */
  return name.replace(/\p{Lu}{5,}/gu, (word) => word[0] + word.slice(1).toLowerCase())
}

function kindOf(instrumentType: string | undefined): MarketKind {
  switch (instrumentType) {
    case 'CRYPTOCURRENCY':
      return 'crypto'
    case 'ETF':
    case 'MUTUALFUND':
      return 'fund'
    case 'INDEX':
      return 'index'
    case 'CURRENCY':
      return 'currency'
    case 'FUTURE':
      return 'commodity'
    default:
      return 'stock'
  }
}

/**
 * The bars of a Yahoo Finance chart, oldest first, sessions without a
 * close left out.
 */
export function parseChart(json: ChartJson): Chart | null {
  const result = json.chart?.result?.[0]
  if (!result?.timestamp || !result.indicators?.quote?.[0]?.close) return null
  const closes = result.indicators.quote[0].close
  const bars: Bar[] = []
  result.timestamp.forEach((seconds, index) => {
    const close = closes[index]
    if (close === null || close === undefined || !Number.isFinite(close)) return
    const day = DateTime.fromSeconds(seconds, { zone: HOME_ZONE }).toISODate()!
    /** Two bars on a day (the live one): the later wins. */
    if (bars.at(-1)?.day === day) bars.pop()
    bars.push({ day, close })
  })
  if (bars.length === 0) return null
  const meta = result.meta ?? {}
  const kind = kindOf(meta.instrumentType)
  const raw = meta.shortName ?? meta.longName ?? null
  return {
    bars,
    kind,
    currency: meta.currency ?? null,
    name: raw ? tidyName(raw) : null,
  }
}
