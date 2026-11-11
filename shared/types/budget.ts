/**
 * Budget types shared by the server (views, controllers) and the client
 * (page props). Amounts are always in cents, dates are ISO `YYYY-MM-DD`.
 */

/** What Yahoo Finance says a quoted value is. */
export type MarketKind = 'index' | 'stock' | 'fund' | 'crypto' | 'currency' | 'commodity'

export const ACCOUNT_TYPES = ['checking', 'savings', 'investment'] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export type AccountSummary = {
  id: number
  name: string
  type: AccountType
  institution: string | null
  isDefault: boolean
  balanceCents: number
}

export type AccountDetail = AccountSummary & {
  wrapper: AccountWrapper | null
  openedOn: string | null
  openingBalanceCents: number
  notes: string | null
  transactionCount: number
}

export type EnvelopeSummary = {
  id: number
  name: string
  monthlyBudgetCents: number
  /** Spent during the current month, as a positive number of cents. */
  spentCents: number
}

export type EnvelopeDetail = EnvelopeSummary & {
  notes: string | null
  /** Extra capture keywords; the envelope name always counts as one. */
  keywords: string[]
}

export type TransactionRow = {
  id: number
  label: string
  amountCents: number
  occurredOn: string
  domain: 'budget' | 'maison' | 'auto' | 'menu'
  envelope: { id: number; name: string } | null
  account: { id: number; name: string } | null
  /** A transfer leg is neither spent nor earned. */
  kind: 'expense' | 'income' | 'transfer'
  /** Typed by hand (or a transfer): deletable from « Argent ». */
  deletable: boolean
}

export type MoneyOverview = {
  netWorthCents: number
  spentThisMonthCents: number
  incomeThisMonthCents: number
  budgetedThisMonthCents: number
  envelopes: EnvelopeSummary[]
  transactions: TransactionRow[]
  /** Expenses of the last 12 months, oldest first, current month last. */
  monthlySpending: MonthlyAmount[]
}

/**
 * An amount for one calendar month, `YYYY-MM`, in cents.
 */
export type MonthlyAmount = {
  month: string
  cents: number
}

/** Tax wrapper of an account; a plain account has none. */
export const ACCOUNT_WRAPPERS = [
  'pea',
  'pea_pme',
  'cto',
  'assurance_vie',
  'per',
  'crypto',
  'livret',
] as const

export type AccountWrapper = (typeof ACCOUNT_WRAPPERS)[number]

export const WRAPPER_LABELS: Record<AccountWrapper, string> = {
  pea: 'PEA',
  pea_pme: 'PEA-PME',
  cto: 'Compte-titres',
  assurance_vie: 'Assurance-vie',
  per: 'PER',
  crypto: 'Portefeuille crypto',
  livret: 'Livret',
}

export const ASSET_CLASSES = ['stock', 'fund', 'crypto', 'bond', 'euro_fund', 'other'] as const

export type AssetClass = (typeof ASSET_CLASSES)[number]

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: 'Actions',
  fund: 'Fonds et ETF',
  crypto: 'Cryptomonnaies',
  bond: 'Obligations',
  euro_fund: 'Fonds euros',
  other: 'Autres',
}

export const OPERATION_KINDS = ['buy', 'sell', 'dividend', 'fee'] as const

export type OperationKind = (typeof OPERATION_KINDS)[number]

export const OPERATION_LABELS: Record<OperationKind, string> = {
  buy: 'Achat',
  sell: 'Vente',
  dividend: 'Dividende',
  fee: 'Frais',
}

/** A line of a portfolio, valued on a day. Prices in euros, amounts in cents. */
export type HoldingRow = {
  id: number
  accountId: number
  name: string
  symbol: string | null
  assetClass: AssetClass
  quantity: number
  /** Average cost of one unit held (weighted average), euros. */
  averageCost: number | null
  costCents: number
  /** Price of one unit in euros; null when nothing is known. */
  price: number | null
  priceOn: string | null
  /** Where the price comes from; « cost »: no price, valued at cost. */
  priceSource: 'market' | 'manual' | 'cost'
  /** A quote older than a week, or a value typed more than 3 months ago. */
  stale: boolean
  valueCents: number
  latentCents: number
  latentPercent: number | null
  /** Change of the value since the previous close, cents. */
  dayChangeCents: number | null
  /** Since January 1st, flows taken out (simple Dietz), percent. */
  ytdPercent: number | null
  dividendsCents: number
  realizedCents: number
  /** Share of the account's value, 0 to 1. */
  weight: number
}

export type PortfolioAccount = {
  id: number
  name: string
  institution: string | null
  wrapper: AccountWrapper | null
  openedOn: string | null
  cashCents: number
  holdingsCents: number
  totalCents: number
  costCents: number
  latentCents: number
  dayChangeCents: number
  holdings: HoldingRow[]
}

export type AllocationSlice = {
  key: AssetClass | 'cash' | 'savings'
  label: string
  cents: number
}

export type PortfolioOverview = {
  /** The day valued, ISO. */
  day: string
  totalCents: number
  /** What the lines held cost. */
  costCents: number
  latentCents: number
  latentPercent: number | null
  dayChangeCents: number
  ytdPercent: number | null
  accounts: PortfolioAccount[]
  /** Savings accounts (livrets), counted in the allocation. */
  savings: Array<{ id: number; name: string; balanceCents: number }>
  allocation: AllocationSlice[]
}

export type OperationRow = {
  id: number
  holdingId: number
  holdingName: string
  kind: OperationKind
  occurredOn: string
  quantity: number | null
  unitPrice: number | null
  feesCents: number
  amountCents: number
}

export type HoldingDetail = HoldingRow & {
  account: { id: number; name: string; wrapper: AccountWrapper | null }
  notes: string | null
  manualPrice: number | null
  manualPricedOn: string | null
  operations: OperationRow[]
}
