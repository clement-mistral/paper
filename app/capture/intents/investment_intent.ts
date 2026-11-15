import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { extractAmount, extractPastDate } from '#capture/extractors'
import {
  amountField,
  dateField,
  hasOverride,
  isoDate,
  numberField,
  pick,
  read,
  selectField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import AccountService from '#domains/budget/services/account_service'
import PortfolioService from '#domains/budget/services/portfolio_service'
import { fromIsoDate, today } from '#support/dates'
import { formatAmount, formatDate } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'

type Kind = 'buy' | 'sell' | 'dividend'

const KIND_LABELS: Record<Kind, string> = { buy: 'Achat', sell: 'Vente', dividend: 'Dividende' }

const KINDS: Array<[Kind, RegExp]> = [
  ['dividend', /\b(dividendes?|coupons?)\b/],
  ['sell', /\b(vente|vendu|vendus|vendue|vends|vendre|cede|cedes|cession)\b/],
  ['buy', /\b(achat|achete|achetes|achetee|acheter|renforce|renfort)\b/],
]

/** Words in capitals that are not tickers. */
const NOT_SYMBOLS = new Set(['PEA', 'PME', 'CTO', 'PER', 'AV', 'EUR', 'EUROS', 'TTC', 'ETF'])

const WRAPPER_WORDS: Array<[RegExp, string]> = [
  [/\bpea pme\b/, 'pea_pme'],
  [/\bpea\b/, 'pea'],
  [/\b(cto|compte titres?)\b/, 'cto'],
  [/\b(assurance vie|av)\b/, 'assurance_vie'],
  [/\bper\b/, 'per'],
  [/\bcrypto\b/, 'crypto'],
]

export type Catalog = Awaited<ReturnType<PortfolioService['catalog']>>

export type ParsedInvestment = {
  kind: Kind | null
  holdingId: number | null
  /** A ticker typed for a line not held yet (« CW8 »). */
  symbol: string | null
  accountId: number | null
  quantity: number | null
  /** Euros, any precision (« 0,0123 BTC à 61 234,56 € »). */
  unitPrice: number | null
  /** Dividend received, or the total of a trade typed without unit price. */
  amountCents: number | null
}

function decimal(raw: string): number {
  return Number(raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.'))
}

/**
 * Reads « achat 10 CW8 à 512,30 € sur le PEA », « vendu 0,5 BTC 30 000 € »,
 * « dividende 12,40 € TotalEnergies ». The line is recognised by its
 * ticker or its name among the ones held, the account by the line or by
 * its wrapper (« PEA »); a trade typed with a total gets its unit price.
 */
export function parseInvestment(raw: string, catalog: Catalog): ParsedInvestment {
  const text = normalize(raw)
  const words = new Set(text.split(' '))
  const kind = KINDS.find(([, pattern]) => pattern.test(text))?.[0] ?? null

  let holding: Catalog['holdings'][number] | null = null
  let best = 0
  for (const candidate of catalog.holdings) {
    const ticker = candidate.symbol ? normalize(candidate.symbol.split('.')[0]) : ''
    const name = normalize(candidate.name)
    const byName = name !== '' && ` ${text} `.includes(` ${name} `) ? name.length : 0
    const byTicker = ticker.length >= 2 && words.has(ticker) ? ticker.length : 0
    const score = Math.max(byName, byTicker)
    if (score > best) {
      best = score
      holding = candidate
    }
  }

  const price = raw.match(
    /(?:\s|^)(?:à|a|@|au prix de)\s*(\d[\d\s\u00A0\u202F]*(?:[.,]\d+)?)\s*(?:€|eur|euros)?/i
  )
  let rest = price ? raw.replace(price[0], ' ') : raw
  /** Only an amount written in euros: a bare number is the quantity. */
  const found = extractAmount(rest)
  const total = found?.explicit ? found : null
  if (total) rest = `${rest.slice(0, total.start)} ${rest.slice(total.end)}`
  const quantity = rest.match(/(?<![\w.,])(\d+(?:[.,]\d+)?)(?![\w.,])/)

  let symbol: string | null = null
  if (!holding) {
    const tickers = [...raw.matchAll(/\b([A-Z][A-Z0-9]{1,9}(?:\.[A-Z]{1,3})?)\b/g)]
      .map((match) => match[1])
      .filter((word) => !NOT_SYMBOLS.has(word))
    symbol = tickers[0] ?? null
  }

  const wrapper = WRAPPER_WORDS.find(([pattern]) => pattern.test(text))?.[1]
  const account =
    (holding && catalog.accounts.find((item) => item.id === holding!.accountId)) ||
    (wrapper && catalog.accounts.find((item) => item.wrapper === wrapper)) ||
    (catalog.accounts.length === 1 ? catalog.accounts[0] : null)

  const amountCents = total?.cents ?? null
  const qty = kind === 'dividend' || !quantity ? null : decimal(quantity[1])
  let unitPrice = price ? decimal(price[1]) : null
  if (unitPrice === null && qty && amountCents && kind !== 'dividend') {
    unitPrice = Math.round((amountCents / 100 / qty) * 10_000) / 10_000
  }

  return {
    kind,
    holdingId: holding?.id ?? null,
    symbol,
    accountId: account?.id ?? null,
    quantity: qty && qty > 0 ? qty : null,
    unitPrice: unitPrice && unitPrice > 0 ? unitPrice : null,
    amountCents: kind === 'dividend' ? amountCents : null,
  }
}

/**
 * « achat 10 CW8 à 512,30 € », « vente 5 AIR à 150 € », « dividende
 * 12,40 € TotalEnergies » → an operation on an investment line, with its
 * money on the account (PortfolioService).
 */
@inject()
export default class InvestmentIntent implements CaptureIntent {
  info = { name: 'investment', label: 'Opération de placement', domain: 'budget' } as const
  keywords = [
    'achat',
    'achete',
    'vente',
    'vendu',
    'dividende',
    'dividendes',
    'coupon',
    'renforce',
    'action',
    'actions',
    'parts',
  ]

  constructor(
    private portfolio: PortfolioService,
    private accounts: AccountService
  ) {}

  /**
   * A known line wins over a plain expense or income (« dividende » and
   * « vendu » are also income words); a new ticker with a quantity too.
   */
  async score(input: NormalizedInput): Promise<number> {
    if (!KINDS.some(([, pattern]) => pattern.test(input.text))) return 0
    const catalog = await this.portfolio.catalog()
    if (catalog.accounts.length === 0) return 0
    const parsed = parseInvestment(input.raw, catalog)
    /**
     * A line recognised is as strong as a signal gets: it must beat the
     * expense (0.8 with « achat » and an amount) and the income (0.85
     * with « dividende ») by the ambiguity margin.
     */
    if (parsed.holdingId) return 1
    if (parsed.kind !== 'dividend' && parsed.symbol && parsed.quantity) return 1
    return 0.2
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    const { kind, quantity, unitPrice, amountCents, occurredOn, accountId, lineName } = draft.data
    const account = await this.accounts.detail(accountId!)
    const cash =
      kind === 'dividend'
        ? amountCents!
        : Math.round(quantity! * unitPrice! * 100) * (kind === 'buy' ? -1 : 1)
    return {
      status: 'ready',
      intent: this.info,
      fields: draft.fields,
      missing: [],
      effects: [
        {
          domain: 'budget',
          title:
            kind === 'dividend'
              ? `Dividende de ${formatAmount(amountCents!)} · ${lineName}`
              : `${KIND_LABELS[kind!]} de ${String(quantity).replace('.', ',')} ${lineName} à ${formatAmount(Math.round(unitPrice! * 100))}`,
          detail: `${account.name} · ${formatDate(fromIsoDate(occurredOn))}`,
        },
        {
          domain: 'budget',
          title: `Liquidités de ${account.name} : ${formatAmount(account.balanceCents)} → ${formatAmount(account.balanceCents + cash)}`,
          detail:
            kind === 'dividend'
              ? 'Compté comme une entrée d’argent'
              : 'Ni une dépense ni une entrée : de l’argent changé en titres',
        },
      ],
    }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    const { kind, holdingId, symbol, quantity, unitPrice, amountCents, occurredOn, accountId } =
      draft.data
    const { operation, holding } = await this.portfolio.recordOperation(
      {
        accountId: accountId!,
        holdingId,
        symbol: holdingId ? null : symbol,
        kind: kind!,
        occurredOn,
        quantity: kind === 'dividend' ? null : quantity,
        unitPrice: kind === 'dividend' ? null : unitPrice,
        amountCents: kind === 'dividend' ? amountCents : null,
      },
      { captureText: input.original },
      trx
    )
    return {
      message: `${KIND_LABELS[kind!]} enregistré sur ${holding.name}`,
      created: [{ type: 'investment_operation' as const, id: operation.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const catalog = await this.portfolio.catalog()
    const parsed = parseInvestment(input.raw, catalog)
    const kind = pick(overrides, 'kind', parsed.kind, (value) =>
      value === 'buy' || value === 'sell' || value === 'dividend' ? value : null
    )
    const accountOverridden = hasOverride(overrides, 'accountId')
    const accountId = accountOverridden ? read.id(overrides.accountId ?? null) : parsed.accountId
    const lines = catalog.holdings.filter((holding) => holding.accountId === accountId)
    const holding = pick(overrides, 'holdingId', parsed.holdingId, read.id)
    const holdingId = lines.some((line) => line.id === holding.value) ? holding.value : null
    const quantity = pick(overrides, 'quantity', parsed.quantity, read.number)
    const unitPrice = pick(overrides, 'unitPrice', parsed.unitPrice, read.number)
    const amount = pick(overrides, 'amountCents', parsed.amountCents, read.cents)
    const date = extractPastDate(input.raw)
    const occurredOn = pick(
      overrides,
      'occurredOn',
      isoDate(date?.date ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const symbol = holdingId ? null : parsed.symbol
    const lineName = lines.find((line) => line.id === holdingId)?.name ?? symbol ?? 'nouvelle ligne'

    const missing: string[] = []
    if (!kind.value) missing.push('Opération')
    if (!accountId) missing.push('Compte')
    if (!holdingId && !symbol) missing.push('Ligne')
    if (kind.value === 'dividend') {
      if (!amount.value || amount.value <= 0) missing.push('Montant')
    } else {
      if (!quantity.value || quantity.value <= 0) missing.push('Quantité')
      if (!unitPrice.value || unitPrice.value <= 0) missing.push('Prix unitaire')
    }

    const fields = [
      selectField(
        'kind',
        'Opération',
        kind.value,
        (Object.keys(KIND_LABELS) as Kind[]).map((value) => ({ value, label: KIND_LABELS[value] })),
        kind.overridden ? 'override' : kind.value ? 'parsed' : 'empty',
        true
      ),
      selectField(
        'accountId',
        'Compte',
        accountId,
        catalog.accounts.map(({ id, name }) => ({ value: id, label: name })),
        accountOverridden ? 'override' : accountId ? 'matched' : 'empty',
        true
      ),
      selectField(
        'holdingId',
        'Ligne',
        holdingId,
        [
          ...(symbol ? [{ value: null, label: `Nouvelle ligne : ${symbol}` }] : []),
          ...lines.map(({ id, name }) => ({ value: id, label: name })),
        ],
        holding.overridden ? 'override' : holdingId ? 'matched' : symbol ? 'parsed' : 'empty',
        true
      ),
      ...(kind.value === 'dividend'
        ? [
            amountField(
              'amountCents',
              'Montant',
              amount.value,
              amount.overridden,
              parsed.amountCents !== null
            ),
          ]
        : [
            numberField('quantity', 'Quantité', quantity.value, quantity.overridden, {
              parsed: parsed.quantity !== null,
            }),
            numberField('unitPrice', 'Prix unitaire', unitPrice.value, unitPrice.overridden, {
              parsed: parsed.unitPrice !== null,
              suffix: '€',
            }),
          ]),
      dateField('occurredOn', 'Date', occurredOn.value, occurredOn.overridden, !!date),
    ]

    return {
      data: {
        kind: kind.value,
        holdingId,
        symbol,
        quantity: quantity.value,
        unitPrice: unitPrice.value,
        amountCents: amount.value,
        occurredOn: occurredOn.value,
        accountId,
        lineName,
      },
      missing,
      fields,
    }
  }
}
