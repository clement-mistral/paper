import Account from '#domains/budget/models/account'
import InvestmentPlan from '#domains/budget/models/investment_plan'
import { milestoneOf, planDays, type Milestone } from '#domains/budget/milestones'
import { toIsoDate, today } from '#support/dates'
import type { InvestmentPlanRow } from '#shared/types/budget'

export type PlanInput = {
  accountId: number
  holdingId: number | null
  amountCents: number
  dayOfMonth: number
}

export type PlanOccurrence = { plan: InvestmentPlanRow; date: string }

/**
 * Public service of the Budget domain for the dates of investments:
 * scheduled monthly contributions and tax milestones, read by the Agenda
 * and the deadline reminders.
 */
export default class InvestmentCalendarService {
  async plans(accountId?: number): Promise<InvestmentPlanRow[]> {
    const query = InvestmentPlan.query()
      .preload('account')
      .preload('holding')
      .orderBy('day_of_month')
    if (accountId) query.where('account_id', accountId)
    const plans = await query
    return plans.map((plan) => ({
      id: plan.id,
      accountId: plan.accountId,
      accountName: plan.account.name,
      holdingId: plan.holdingId,
      holdingName: plan.holding?.name ?? null,
      amountCents: plan.amountCents,
      dayOfMonth: plan.dayOfMonth,
      startsOn: toIsoDate(plan.startsOn),
    }))
  }

  async createPlan(input: PlanInput) {
    return InvestmentPlan.create({ ...input, startsOn: today() })
  }

  async deletePlan(accountId: number, id: number) {
    await InvestmentPlan.query().where({ id, accountId }).delete()
  }

  async occurrences(start: string, end: string): Promise<PlanOccurrence[]> {
    const plans = await this.plans()
    return plans.flatMap((plan) => planDays(plan, start, end).map((date) => ({ plan, date })))
  }

  /** The tax milestones falling between two days (included). */
  async milestones(start: string, end: string): Promise<Milestone[]> {
    const accounts = await Account.query().whereNotNull('wrapper').whereNotNull('opened_on')
    return accounts
      .map((account) =>
        milestoneOf({
          id: account.id,
          name: account.name,
          wrapper: account.wrapper,
          openedOn: account.openedOn ? toIsoDate(account.openedOn) : null,
        })
      )
      .filter((milestone): milestone is Milestone => milestone !== null)
      .filter((milestone) => milestone.date >= start && milestone.date <= end)
  }
}
