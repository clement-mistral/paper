/**
 * Budget types shared by the server (views, controllers) and the client
 * (page props). Amounts are always in cents, dates are ISO `YYYY-MM-DD`.
 */

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
