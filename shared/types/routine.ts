import type { TransactionRow } from './budget.js'
import type { TaskRow } from './lists.js'
import type { MealPlanRow } from './menu.js'

/**
 * Daily review (« bilan du jour ») shared types.
 */

export const MOODS = [1, 2, 3, 4, 5] as const

export type Mood = (typeof MOODS)[number]

export type HabitRow = { id: number; name: string; done: boolean }

export type ReviewSection = 'money' | 'tasks' | 'meals'

export type DailyReview = {
  day: string
  /** Still editable: today, or yesterday until noon. */
  open: boolean
  /** Deadline to complete it, ISO date-time. */
  deadline: string
  completed: boolean
  moneyConfirmed: boolean
  expenses: TransactionRow[]
  spentCents: number
  tasks: { open: TaskRow[]; closed: Array<TaskRow & { cancelled: boolean }> }
  meals: MealPlanRow[]
  habits: HabitRow[]
  mood: Mood | null
  note: string | null
  /** Sections still blocking the validation. */
  pending: ReviewSection[]
}

export type Streak = {
  current: number
  best: number
  /** Last 26 weeks, oldest first: one entry per day. */
  days: Array<{ day: string; completed: boolean }>
}

/**
 * Shared with every page, for the sidebar and « Aujourd'hui ».
 */
export type RoutineStatus = {
  streak: number
  /** Review waiting to be done now, if any. */
  due: { day: string; label: 'today' | 'yesterday'; deadline: string } | null
  /** True from 18:00: the review of today is highlighted. */
  evening: boolean
  todayCompleted: boolean
}
