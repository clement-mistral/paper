import type { Domain } from './domain.js'

/**
 * « Compte rendu du mois » : one printable A4 sheet across every domain.
 * Amounts in cents (expenses positive), dates `YYYY-MM-DD`.
 */
export type MonthlyReport = {
  /** `YYYY-MM`. */
  month: string
  previousMonth: string
  nextMonth: string
  /** False for the current month: figures are still moving. */
  complete: boolean
  generatedOn: string
  householdName: string | null

  money: {
    spentCents: number
    previousSpentCents: number
    incomeCents: number
    budgetedCents: number
    netWorthCents: number
    byDomain: Array<{ domain: Domain; cents: number }>
    byEnvelope: Array<{ name: string; spentCents: number; budgetCents: number }>
    topExpenses: Array<{ label: string; occurredOn: string; cents: number; domain: Domain }>
    /** Last 6 months, oldest first, this month last. */
    trend: Array<{ month: string; cents: number }>
  }

  maison: {
    billsPaid: { count: number; cents: number }
    subscriptionsCents: number
    maintenances: Array<{ label: string; equipment: string; doneOn: string; cents: number | null }>
    projects: Array<{ title: string; status: string; spentCents: number }>
    claims: Array<{ title: string; status: string; occurredOn: string }>
    meters: Array<{
      label: string
      unit: string
      /** Consumption during the month, interpolated between readings. */
      consumption: number | null
      /** Some readings fall outside the month: a prorata estimate. */
      estimated: boolean
      previous: number | null
    }>
    chores: { done: number; open: number; overdue: number }
  }

  auto: Array<{
    name: string
    distanceKm: number | null
    fillUps: number
    liters: number
    fuelCents: number
    pricePerLiterCents: number | null
    litersPer100Km: number | null
    maintenances: Array<{ title: string; doneOn: string; cents: number | null }>
  }>

  menu: {
    planned: number
    cooked: number
    other: number
    eatenOut: number
    topRecipes: Array<{ name: string; count: number }>
  }

  routine: {
    daysInMonth: number
    reviewedDays: number
    bestStreak: number
    averageMood: number | null
    habits: Array<{ name: string; days: number }>
    tasksDone: number
  }

  /** What falls due during the next month. */
  upcoming: Array<{ date: string | null; label: string; detail: string | null; domain: Domain }>
}
