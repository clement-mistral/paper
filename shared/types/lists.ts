import type { Domain } from './domain.js'

export type ShoppingItemRow = {
  id: number
  label: string
  quantity: number | null
  unit: string | null
  reasonDomain: Domain | null
  reason: string | null
  checked: boolean
}

export const RECURRENCES = ['daily', 'weekly', 'monthly', 'yearly'] as const

export type Recurrence = (typeof RECURRENCES)[number]

export type TaskRow = {
  id: number
  title: string
  dueOn: string | null
  dueTime: string | null
  domain: Domain | null
  recurrence: Recurrence | null
  recurrenceInterval: number
  done: boolean
  overdue: boolean
  /** Created by another domain (a bill to pay…). */
  automatic: boolean
  itemCount: number
  itemDoneCount: number
  /** Household chore shown in the « Ménage » section of the home. */
  isChore: boolean
  room: string | null
  /** When the previous occurrence was done, `YYYY-MM-DD`. */
  lastDoneOn: string | null
}

export type TaskDetail = TaskRow & {
  notes: string | null
  items: Array<{ id: number; label: string; done: boolean }>
  /** Link to the item behind an automatic task. */
  source: { label: string; href: string } | null
}
