import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { CheckSquare, NotebookPen, Users, Wallet } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button from '~/components/ui/button'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import ProgressBar from '~/components/ui/progress_bar'
import ProjectsIcon from '~/components/icons/projects_icon'
import { cn } from '~/lib/cn'
import { formatAmount } from '~/lib/format'
import { STATUS_TONES } from '~/lib/projects'
import { ICON_STROKE } from '~/lib/icons'
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectCard } from '#shared/types/projects'
import type { InertiaProps } from '~/types'

/**
 * « Projets »: a board of the personal projects by status (idea, in
 * progress, paused, done), the most recently touched first.
 */
export default function Projects({ projects }: InertiaProps<{ projects: ProjectCard[] }>) {
  const [title, setTitle] = useState('')

  return (
    <Page
      title="Projets"
      description="Vos projets personnels : notes, tâches, liens et budget. Visibles par vous seul, sauf si vous les partagez."
    >
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim() !== '') router.post(urlFor('personal_projects.store'), { title })
        }}
      >
        <label htmlFor="project-title" className="sr-only">
          Nouveau projet
        </label>
        <input
          id="project-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Un nouveau projet : « Refaire le jardin », « Apprendre la guitare »…"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-control border border-border bg-bg px-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
        />
        <Button type="submit" className="h-10" disabled={title.trim() === ''}>
          Créer
        </Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState icon={<ProjectsIcon size={20} />} title="Aucun projet pour l’instant">
          Une idée en tête ? Donnez-lui un nom ci-dessus : vous y rangerez ensuite vos notes, vos
          tâches, vos liens et ce qu’il coûte.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROJECT_STATUSES.map((status) => {
            const column = projects.filter((project) => project.status === status)
            return (
              <section key={status} className="flex min-w-0 flex-col gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span
                    aria-hidden="true"
                    className={cn('size-2 rounded-full', STATUS_TONES[status].dot)}
                  />
                  {PROJECT_STATUS_LABELS[status]}
                  <span className="text-label font-normal text-muted">{column.length}</span>
                </h2>
                {column.length === 0 ? (
                  <p className="rounded-card border border-dashed border-border px-3 py-4 text-center text-label text-muted">
                    Aucun
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {column.map((project) => (
                      <li key={project.id}>
                        <Card project={project} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Page>
  )
}

function Card({ project }: { project: ProjectCard }) {
  const tone = STATUS_TONES[project.status]
  return (
    <Link
      route="personal_projects.show"
      routeParams={{ id: project.id }}
      className={cn(
        'flex flex-col gap-2 rounded-card border border-border bg-bg p-3 transition-shadow hover:shadow-md',
        'border-l-[3px]',
        tone.edge
      )}
    >
      <span className="text-sm font-medium text-ink">{project.title}</span>
      {project.taskCount > 0 && (
        <ProgressBar
          value={project.taskDoneCount / project.taskCount}
          tone="ink"
          label={`Tâches faites de ${project.title}`}
        />
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted">
        {project.taskCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckSquare size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {project.taskDoneCount}/{project.taskCount}
          </span>
        )}
        {project.noteCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <NotebookPen size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {project.noteCount}
          </span>
        )}
        {(project.budgetCents !== null || project.spentCents > 0) && (
          <span className="inline-flex items-center gap-1">
            <Wallet size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {formatAmount(project.spentCents)}
            {project.budgetCents !== null && ` / ${formatAmount(project.budgetCents)}`}
          </span>
        )}
        {project.shared && (
          <span className={cn('inline-flex items-center gap-1', tone.text)}>
            <Users size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {project.mine ? 'Partagé' : `De ${project.ownerName}`}
          </span>
        )}
      </span>
    </Link>
  )
}

Projects.layout = [AppShell]
