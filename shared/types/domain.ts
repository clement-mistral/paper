/**
 * The four domains of Paper. Every item shown in a cross-domain view
 * (Aujourd'hui, Agenda, Argent…) carries one of them.
 */
export const DOMAINS = ['budget', 'maison', 'auto', 'menu'] as const

export type Domain = (typeof DOMAINS)[number]

/**
 * Lifecycle of anything with a due date (maintenance, bill, task…).
 */
export type Status = 'done' | 'planned' | 'upcoming' | 'overdue'
