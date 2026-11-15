import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { ChevronRight, ExternalLink, Pencil, Trash2, Users, X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import AmountCell from '~/components/domain/amount_cell'
import Button from '~/components/ui/button'
import Checkbox from '~/components/ui/checkbox'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import ProgressBar from '~/components/ui/progress_bar'
import Section from '~/components/ui/section'
import Textarea from '~/components/ui/textarea'
import { cn } from '~/lib/cn'
import { formatAmount, formatDate, formatLongDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { STATUS_TONES } from '~/lib/projects'
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectDetail } from '#shared/types/projects'
import type { InertiaProps } from '~/types'

const iconButton =
  'grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger'

/**
 * One personal project: its settings, tasks, notes, links and budget.
 */
export default function ProjectShow({
  project,
  today,
}: InertiaProps<{ project: ProjectDetail; today: string }>) {
  const id = project.id
  const tone = STATUS_TONES[project.status]

  return (
    <Page
      title={project.title}
      breadcrumb={
        <nav aria-label="Fil d’Ariane" className="flex items-center gap-1.5">
          <Link route="personal_projects.index" className="hover:text-ink hover:underline">
            Projets
          </Link>
          <ChevronRight size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span
            className={cn('rounded-tag px-1.5 py-0.5 text-xs font-medium', tone.soft, tone.text)}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          {project.shared && (
            <span className="inline-flex items-center gap-1 text-label">
              <Users size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
              {project.mine ? 'partagé avec le foyer' : `projet de ${project.ownerName}`}
            </span>
          )}
        </nav>
      }
      description={project.description ?? undefined}
      actions={
        project.mine ? (
          <DeleteButton
            href={urlFor('personal_projects.destroy', { id })}
            label="Supprimer le projet ? Ses notes, tâches et liens aussi ; ses dépenses restent dans Argent."
          />
        ) : undefined
      }
    >
      <Settings project={project} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Tasks project={project} />
        <Links project={project} />
      </div>

      <Notes project={project} />

      <Budget project={project} today={today} />
    </Page>
  )
}

function Settings({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState(false)
  return (
    <Section title="Le projet">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label text-muted">Statut</span>
        {PROJECT_STATUSES.map((status) => {
          const active = project.status === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() =>
                router.put(
                  urlFor('personal_projects.update', { id: project.id }),
                  {
                    title: project.title,
                    description: project.description,
                    status,
                    budget: project.budgetCents === null ? null : project.budgetCents / 100,
                  },
                  { preserveScroll: true }
                )
              }
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-label transition-colors',
                active
                  ? cn(
                      'border-transparent font-medium',
                      STATUS_TONES[status].soft,
                      STATUS_TONES[status].text
                    )
                  : 'border-border text-ink hover:bg-hover'
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', STATUS_TONES[status].dot)}
              />
              {PROJECT_STATUS_LABELS[status]}
            </button>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Pencil size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Modifier
        </Button>
      </div>

      {open && (
        <Form
          route="personal_projects.update"
          routeParams={{ id: project.id }}
          options={{ preserveScroll: true }}
          onSuccess={() => setOpen(false)}
        >
          {({ errors, processing }) => (
            <div className="flex max-w-2xl flex-col gap-4 pt-2">
              <input type="hidden" name="status" value={project.status} />
              <Input
                label="Nom"
                name="title"
                required
                defaultValue={project.title}
                error={errors.title}
              />
              <Textarea
                label="Description"
                name="description"
                rows={3}
                defaultValue={project.description ?? ''}
                error={errors.description}
              />
              <Input
                className="max-w-48"
                label="Budget prévu (€, facultatif)"
                name="budget"
                type="number"
                step="0.01"
                min="0"
                defaultValue={project.budgetCents === null ? '' : project.budgetCents / 100}
                error={errors.budget}
              />
              {project.mine && (
                <>
                  <input type="hidden" name="sharing" value="true" />
                  <Checkbox
                    strike={false}
                    label="Partager avec le foyer (visible et modifiable par tous)"
                    name="shared"
                    value="true"
                    defaultChecked={project.shared}
                  />
                </>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={processing}>
                  Enregistrer
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </Form>
      )}
    </Section>
  )
}

function Tasks({ project }: { project: ProjectDetail }) {
  const [title, setTitle] = useState('')
  const done = project.tasks.filter((task) => task.done).length
  return (
    <Section
      title={`Tâches${project.tasks.length > 0 ? ` · ${done}/${project.tasks.length}` : ''}`}
    >
      {project.tasks.length > 0 && (
        <ProgressBar value={done / project.tasks.length} label="Tâches faites" />
      )}
      <ul className="flex flex-col">
        {project.tasks.map((task) => (
          <li
            key={task.id}
            className="group flex min-h-10 items-center gap-3 border-b border-border py-1"
          >
            <input
              id={`project-task-${task.id}`}
              type="checkbox"
              checked={task.done}
              onChange={() =>
                router.patch(
                  urlFor('personal_projects.tasks.toggle', { id: project.id, itemId: task.id }),
                  {},
                  { preserveScroll: true }
                )
              }
              className="size-4 shrink-0 cursor-pointer accent-accent"
            />
            <label
              htmlFor={`project-task-${task.id}`}
              className={cn(
                'min-w-0 flex-1 cursor-pointer text-sm',
                task.done ? 'text-muted line-through' : 'text-ink'
              )}
            >
              {task.title}
            </label>
            <button
              type="button"
              aria-label={`Supprimer ${task.title}`}
              onClick={() =>
                router.delete(
                  urlFor('personal_projects.tasks.destroy', { id: project.id, itemId: task.id }),
                  { preserveScroll: true }
                )
              }
              className={cn(iconButton, 'opacity-0 group-hover:opacity-100 focus:opacity-100')}
            >
              <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim() === '') return
          router.post(
            urlFor('personal_projects.tasks.store', { id: project.id }),
            { title },
            { preserveScroll: true, onSuccess: () => setTitle('') }
          )
        }}
      >
        <label htmlFor="project-task" className="sr-only">
          Nouvelle tâche
        </label>
        <input
          id="project-task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ajouter une tâche…"
          autoComplete="off"
          className="h-9 min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={title.trim() === ''}>
          Ajouter
        </Button>
      </form>
    </Section>
  )
}

function Links({ project }: { project: ProjectDetail }) {
  return (
    <Section title="Liens">
      {project.links.length > 0 && (
        <ul className="flex flex-col">
          {project.links.map((link) => (
            <li
              key={link.id}
              className="group flex min-h-10 items-center gap-3 border-b border-border py-1"
            >
              <ExternalLink
                size={15}
                strokeWidth={ICON_STROKE}
                aria-hidden="true"
                className="shrink-0 text-accent"
              />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 flex-col hover:underline"
              >
                <span className="truncate text-sm text-ink">{link.title || link.host}</span>
                {link.title && <span className="truncate text-label text-muted">{link.host}</span>}
              </a>
              <button
                type="button"
                aria-label={`Retirer le lien ${link.title || link.host}`}
                onClick={() =>
                  router.delete(
                    urlFor('personal_projects.links.destroy', { id: project.id, itemId: link.id }),
                    { preserveScroll: true }
                  )
                }
                className={cn(iconButton, 'opacity-0 group-hover:opacity-100 focus:opacity-100')}
              >
                <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Form
        route="personal_projects.links.store"
        routeParams={{ id: project.id }}
        options={{ preserveScroll: true }}
        resetOnSuccess
      >
        {({ errors, processing }) => (
          <div className="flex flex-col gap-2">
            <Input
              label="Adresse"
              hideLabel
              name="url"
              type="url"
              required
              placeholder="https://…"
              error={errors.url}
            />
            <div className="flex gap-2">
              <Input
                className="min-w-0 flex-1"
                label="Titre"
                hideLabel
                name="title"
                placeholder="Titre (facultatif)"
                error={errors.title}
              />
              <Button type="submit" variant="secondary" disabled={processing}>
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </Form>
    </Section>
  )
}

function Notes({ project }: { project: ProjectDetail }) {
  const [editing, setEditing] = useState<number | null>(null)
  return (
    <Section title={`Notes${project.notes.length > 0 ? ` · ${project.notes.length}` : ''}`}>
      <Form
        route="personal_projects.notes.store"
        routeParams={{ id: project.id }}
        options={{ preserveScroll: true }}
        resetOnSuccess
      >
        {({ errors, processing }) => (
          <div className="flex flex-col gap-2">
            <Textarea
              label="Nouvelle note"
              hideLabel
              name="body"
              rows={3}
              required
              placeholder="Une idée, un compte rendu, une mesure à retenir…"
              error={errors.body}
            />
            <div>
              <Button type="submit" variant="secondary" disabled={processing}>
                Ajouter la note
              </Button>
            </div>
          </div>
        )}
      </Form>
      <ul className="flex flex-col gap-3">
        {project.notes.map((note) => (
          <li key={note.id} className="rounded-card bg-callout px-4 py-3">
            <p className="mb-1.5 flex items-center gap-2 text-label text-muted">
              <span className="flex-1">
                {formatLongDate(note.createdAt)}
                {note.author && ` · ${note.author}`}
              </span>
              <button
                type="button"
                aria-label="Modifier la note"
                onClick={() => setEditing(editing === note.id ? null : note.id)}
                className="grid size-7 place-items-center rounded-control hover:bg-hover hover:text-ink"
              >
                <Pencil size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Supprimer la note"
                onClick={() => {
                  if (window.confirm('Supprimer cette note ?')) {
                    router.delete(
                      urlFor('personal_projects.notes.destroy', {
                        id: project.id,
                        itemId: note.id,
                      }),
                      { preserveScroll: true }
                    )
                  }
                }}
                className="grid size-7 place-items-center rounded-control hover:bg-hover hover:text-danger"
              >
                <Trash2 size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </p>
            {editing === note.id ? (
              <Form
                route="personal_projects.notes.update"
                routeParams={{ id: project.id, itemId: note.id }}
                options={{ preserveScroll: true }}
                onSuccess={() => setEditing(null)}
              >
                {({ processing }) => (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      label="Note"
                      hideLabel
                      name="body"
                      rows={4}
                      defaultValue={note.body}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={processing}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </Form>
            ) : (
              <p className="text-sm whitespace-pre-line text-ink">{note.body}</p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Budget({ project, today }: { project: ProjectDetail; today: string }) {
  const over = project.budgetCents !== null && project.spentCents > project.budgetCents
  return (
    <Section title="Budget et dépenses">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold text-ink tabular-nums">
          {formatAmount(project.spentCents)}
          {project.budgetCents !== null && (
            <span className="text-base font-normal text-muted">
              {' '}
              sur {formatAmount(project.budgetCents)}
            </span>
          )}
        </p>
        <p className="text-label text-muted">
          Les dépenses comptent aussi dans Argent, sur le compte par défaut.
        </p>
      </div>
      {project.budgetCents !== null && project.budgetCents > 0 && (
        <ProgressBar
          value={project.spentCents / project.budgetCents}
          tone={over ? 'danger' : 'ink'}
          label="Part du budget dépensée"
        />
      )}
      {project.expenses.length > 0 && (
        <ul className="flex flex-col">
          {project.expenses.map((expense) => (
            <li
              key={expense.id}
              className="group flex min-h-10 items-center gap-3 border-b border-border py-1"
            >
              <span className="w-24 shrink-0 text-label text-muted tabular-nums">
                {formatDate(expense.occurredOn)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{expense.label}</span>
              <AmountCell cents={expense.amountCents} />
              <button
                type="button"
                aria-label={`Supprimer la dépense ${expense.label}`}
                onClick={() => {
                  if (window.confirm(`Supprimer « ${expense.label} » (aussi dans Argent) ?`)) {
                    router.delete(
                      urlFor('personal_projects.expenses.destroy', {
                        id: project.id,
                        itemId: expense.id,
                      }),
                      { preserveScroll: true }
                    )
                  }
                }}
                className={cn(iconButton, 'opacity-0 group-hover:opacity-100 focus:opacity-100')}
              >
                <Trash2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Form
        route="personal_projects.expenses.store"
        routeParams={{ id: project.id }}
        options={{ preserveScroll: true }}
        resetOnSuccess={['amount', 'label']}
      >
        {({ errors, processing }) => (
          <div className="flex flex-wrap items-end gap-3">
            <Input
              className="min-w-40 flex-1"
              label="Dépense"
              name="label"
              required
              placeholder="Graines, outils…"
              error={errors.label}
            />
            <Input
              className="w-32"
              label="Montant (€)"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              error={errors.amount}
            />
            <Input
              className="w-40"
              label="Date"
              name="occurredOn"
              type="date"
              required
              defaultValue={today}
              error={errors.occurredOn}
            />
            <Button type="submit" variant="secondary" disabled={processing}>
              Ajouter
            </Button>
          </div>
        )}
      </Form>
    </Section>
  )
}

ProjectShow.layout = [AppShell]
