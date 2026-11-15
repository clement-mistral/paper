import { merchantKey, type StatementLine } from '#domains/budget/import/statement'

/** A card payment shows up at the bank a few days after it was typed. */
export const DAYS_BEFORE = 5
export const DAYS_AFTER = 2

export type Candidate = {
  id: number
  occurredOn: string
  label: string
  amountCents: number
}

function days(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function sameMerchant(a: string, b: string): boolean {
  const left = new Set(merchantKey(a).split(' ').filter(Boolean))
  return merchantKey(b)
    .split(' ')
    .some((word) => left.has(word))
}

/**
 * Pairs statement lines with transactions typed by hand: same amount, the
 * bank date from 5 days after to 2 days before the typed one, the closest
 * first (a shared merchant word wins a tie). Each transaction confirms one
 * line at most. Returns line index → transaction id.
 */
export function matchLines(lines: StatementLine[], candidates: Candidate[]): Map<number, number> {
  const pairs: Array<{ line: number; candidate: Candidate; distance: number; merchant: boolean }> =
    []
  lines.forEach((line, index) => {
    for (const candidate of candidates) {
      if (candidate.amountCents !== line.amountCents) continue
      const gap = days(candidate.occurredOn, line.occurredOn)
      if (gap > DAYS_BEFORE || gap < -DAYS_AFTER) continue
      pairs.push({
        line: index,
        candidate,
        distance: Math.abs(gap),
        merchant: sameMerchant(line.label, candidate.label),
      })
    }
  })
  pairs.sort(
    (a, b) =>
      Number(b.merchant) - Number(a.merchant) ||
      a.distance - b.distance ||
      a.line - b.line ||
      a.candidate.id - b.candidate.id
  )

  const matched = new Map<number, number>()
  const used = new Set<number>()
  for (const pair of pairs) {
    if (matched.has(pair.line) || used.has(pair.candidate.id)) continue
    matched.set(pair.line, pair.candidate.id)
    used.add(pair.candidate.id)
  }
  return matched
}
