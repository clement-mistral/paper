/**
 * Personal projects (« Projets »).
 */
export const PROJECT_STATUSES = ['idea', 'active', 'paused', 'done'] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idée',
  active: 'En cours',
  paused: 'En pause',
  done: 'Terminé',
}

export type ProjectCard = {
  id: number
  title: string
  status: ProjectStatus
  shared: boolean
  /** The signed-in person owns it (else: shared by someone else). */
  mine: boolean
  ownerName: string
  taskCount: number
  taskDoneCount: number
  noteCount: number
  budgetCents: number | null
  spentCents: number
  updatedAt: string
}

export type ProjectDetail = ProjectCard & {
  description: string | null
  notes: Array<{ id: number; body: string; author: string | null; createdAt: string }>
  tasks: Array<{ id: number; title: string; done: boolean }>
  links: Array<{ id: number; url: string; title: string | null; host: string }>
  expenses: Array<{ id: number; label: string; amountCents: number; occurredOn: string }>
}
