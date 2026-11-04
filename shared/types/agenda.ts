import type { Domain } from './domain.js'

/**
 * A dated item of any domain, as shown in « Aujourd'hui » and « Agenda ».
 */
export type AgendaItem = {
  key: string
  kind: 'task' | 'meal' | 'bill' | 'subscription' | 'maintenance' | 'equipment_maintenance'
  domain: Domain
  title: string
  detail: string | null
  date: string
  time: string | null
  href: string
  /** Tasks can be checked in place. */
  taskId: number | null
  done: boolean
}

export type TodayOverview = {
  overdue: AgendaItem[]
  today: AgendaItem[]
  tomorrow: AgendaItem[]
  /** Open tasks without a date. */
  someday: AgendaItem[]
  shoppingCount: number
}

export type AgendaOverview = {
  start: string
  days: Array<{ date: string; items: AgendaItem[] }>
}
