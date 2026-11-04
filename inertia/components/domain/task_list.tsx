import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { ListChecks, Repeat, Sparkles } from 'lucide-react'
import { urlFor } from '~/client'
import Button from '~/components/ui/button'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Section from '~/components/ui/section'
import { cn } from '~/lib/cn'
import { formatShortDay, todayIso } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { TaskRow } from '#shared/types/lists'

function due(task: TaskRow): string | null {
  if (!task.dueOn) return null
  const today = todayIso()
  const label = task.dueOn === today ? 'Aujourd’hui' : formatShortDay(task.dueOn)
  return task.dueTime ? `${label} ${task.dueTime.replace(':', 'h')}` : label
}

/**
 * « À faire »: open tasks first (overdue in red), recently done ones
 * crossed out. A quick field adds an undated task.
 */
export default function TaskList({ tasks }: { tasks: TaskRow[] }) {
  const [title, setTitle] = useState('')

  return (
    <Section title="À faire">
      <Form
        route="tasks.store"
        options={{ preserveScroll: true }}
        onSuccess={() => setTitle('')}
        className="flex gap-2"
      >
        {({ processing }) => (
          <>
            <label htmlFor="task-title" className="sr-only">
              Ajouter une tâche
            </label>
            <input
              id="task-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ajouter une tâche…"
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
            />
            <Button type="submit" variant="secondary" disabled={processing || title.trim() === ''}>
              Ajouter
            </Button>
          </>
        )}
      </Form>

      {tasks.length === 0 ? (
        <EmptyState icon={<ListChecks size={20} strokeWidth={ICON_STROKE} />} title="Rien à faire">
          Avec Ctrl K : « appeler le plombier demain 14h », « sortir les poubelles tous les mardis
          ».
        </EmptyState>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex min-h-10 items-center gap-3 border-b border-border py-1"
            >
              <input
                type="checkbox"
                aria-label={`Fait : ${task.title}`}
                checked={task.done}
                onChange={() =>
                  router.patch(
                    urlFor('tasks.toggle', { id: task.id }),
                    {},
                    { preserveScroll: true }
                  )
                }
                className="size-4 shrink-0 cursor-pointer accent-ink"
              />
              <Link
                route="tasks.show"
                routeParams={{ id: task.id }}
                className={cn(
                  'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 hover:underline',
                  task.done && 'text-muted line-through'
                )}
              >
                <span className="text-sm">{task.title}</span>
                {task.itemCount > 0 && (
                  <span className="text-label text-muted">
                    {task.itemDoneCount}/{task.itemCount}
                  </span>
                )}
              </Link>
              {task.recurrence && (
                <Repeat
                  size={14}
                  strokeWidth={ICON_STROKE}
                  aria-label="Récurrente"
                  className="text-muted"
                />
              )}
              {task.automatic && (
                <Sparkles
                  size={14}
                  strokeWidth={ICON_STROKE}
                  aria-label="Automatique"
                  className="text-muted"
                />
              )}
              {due(task) && (
                <span
                  className={cn(
                    'text-label whitespace-nowrap',
                    task.overdue ? 'text-danger' : 'text-muted'
                  )}
                >
                  {due(task)}
                </span>
              )}
              {task.domain && <DomainTag domain={task.domain} className="hidden sm:inline-flex" />}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
