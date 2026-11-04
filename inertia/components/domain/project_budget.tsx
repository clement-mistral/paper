import ProgressBar from '~/components/ui/progress_bar'
import { formatAmount } from '~/lib/format'
import type { Status } from '#shared/types/domain'
import type { ProjectRow, ProjectStatus } from '#shared/types/maison'

export const projectTone: Record<ProjectStatus, Status> = {
  idea: 'planned',
  planned: 'planned',
  in_progress: 'upcoming',
  done: 'done',
  abandoned: 'planned',
}

/**
 * Spent against the planned budget: maison colour, warning past 90 %,
 * danger over budget.
 */
export default function ProjectBudget({
  project,
}: {
  project: Pick<ProjectRow, 'budgetCents' | 'spentCents' | 'title'>
}) {
  if (!project.budgetCents) {
    return (
      <span className="text-muted">
        {project.spentCents > 0 ? `${formatAmount(project.spentCents)} dépensés` : '—'}
      </span>
    )
  }
  const ratio = project.spentCents / project.budgetCents
  const tone = ratio > 1 ? 'danger' : ratio > 0.9 ? 'warning' : 'maison'
  return (
    <span className="flex min-w-36 flex-col gap-1">
      <span className="text-label text-muted">
        {formatAmount(project.spentCents)} / {formatAmount(project.budgetCents)}
      </span>
      <ProgressBar value={ratio} tone={tone} label={`Budget de ${project.title}`} />
    </span>
  )
}
