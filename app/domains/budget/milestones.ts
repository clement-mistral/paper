import type { AccountWrapper } from '#shared/types/budget'

/**
 * Tax milestones of an investment account (French rules), from its
 * opening date:
 * - PEA, PEA-PME: after 5 years, a withdrawal no longer closes the plan
 *   and the gains are exempt from income tax (social charges remain);
 * - assurance-vie: after 8 years, the gains withdrawn get a yearly
 *   allowance (4 600 €, 9 200 € for a couple) before income tax.
 */
const RULES: Partial<Record<AccountWrapper, { years: number; title: string; detail: string }>> = {
  pea: {
    years: 5,
    title: 'Les 5 ans du PEA',
    detail: 'retraits possibles sans clôture, gains exonérés d’impôt sur le revenu',
  },
  pea_pme: {
    years: 5,
    title: 'Les 5 ans du PEA-PME',
    detail: 'retraits possibles sans clôture, gains exonérés d’impôt sur le revenu',
  },
  assurance_vie: {
    years: 8,
    title: 'Les 8 ans de l’assurance-vie',
    detail: 'abattement annuel sur les gains retirés (4 600 €, 9 200 € pour un couple)',
  },
}

export type Milestone = {
  accountId: number
  /** `YYYY-MM-DD`. */
  date: string
  title: string
  detail: string
}

/** The milestone of an account, if its wrapper has one and it is opened. */
export function milestoneOf(account: {
  id: number
  name: string
  wrapper: AccountWrapper | null
  openedOn: string | null
}): Milestone | null {
  const rule = account.wrapper ? RULES[account.wrapper] : undefined
  if (!rule || !account.openedOn) return null
  const [year, month, day] = account.openedOn.split('-').map(Number)
  // 29 February opens: the anniversary falls on 28 February when needed.
  const date = new Date(Date.UTC(year + rule.years, month - 1, day))
  if (date.getUTCMonth() !== month - 1) date.setUTCDate(0)
  return {
    accountId: account.id,
    date: date.toISOString().slice(0, 10),
    title: `${rule.title} « ${account.name} »`,
    detail: rule.detail,
  }
}

/**
 * The days of a monthly plan between two days (included), from its start.
 */
export function planDays(
  plan: { dayOfMonth: number; startsOn: string },
  start: string,
  end: string
): string[] {
  const days: string[] = []
  const [year, month] = start.split('-').map(Number)
  for (let offset = 0; ; offset++) {
    const date = new Date(Date.UTC(year, month - 1 + offset, plan.dayOfMonth))
    const iso = date.toISOString().slice(0, 10)
    if (iso > end) break
    if (iso >= start && iso >= plan.startsOn) days.push(iso)
  }
  return days
}
