import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Check, X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button, { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { ICON_STROKE } from '~/lib/icons'
import { DOMAINS } from '#shared/types/domain'
import { RECURRENCES, type Recurrence, type TaskDetail } from '#shared/types/lists'
import type { InertiaProps } from '~/types'

const recurrenceLabels: Record<Recurrence, string> = {
  daily: 'jour(s)',
  weekly: 'semaine(s)',
  monthly: 'mois',
  yearly: 'an(s)',
}

function Checklist({ task }: { task: TaskDetail }) {
  const [label, setLabel] = useState('')
  return (
    <Section title="Checklist">
      {task.items.length > 0 && (
        <ul className="flex flex-col">
          {task.items.map((item) => (
            <li
              key={item.id}
              className="group flex min-h-9 items-center gap-3 border-b border-border"
            >
              <input
                id={`item-${item.id}`}
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  router.patch(
                    urlFor('tasks.items.toggle', { itemId: item.id }),
                    {},
                    { preserveScroll: true }
                  )
                }
                className="size-4 cursor-pointer accent-ink"
              />
              <label
                htmlFor={`item-${item.id}`}
                className={cn(
                  'flex-1 cursor-pointer text-sm',
                  item.done && 'text-muted line-through'
                )}
              >
                {item.label}
              </label>
              <button
                type="button"
                aria-label={`Retirer ${item.label}`}
                onClick={() =>
                  router.delete(urlFor('tasks.items.destroy', { itemId: item.id }), {
                    preserveScroll: true,
                  })
                }
                className="grid size-8 place-items-center rounded-control text-muted opacity-0 group-hover:opacity-100 hover:bg-hover focus:opacity-100"
              >
                <X size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Form
        route="tasks.items.store"
        routeParams={{ id: task.id }}
        options={{ preserveScroll: true }}
        onSuccess={() => setLabel('')}
        className="flex gap-2"
      >
        <label htmlFor="item-label" className="sr-only">
          Ajouter un élément
        </label>
        <input
          id="item-label"
          name="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ajouter un élément…"
          autoComplete="off"
          className="h-9 min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-sm focus:border-ink focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={label.trim() === ''}>
          Ajouter
        </Button>
      </Form>
    </Section>
  )
}

export default function TaskShow({ task }: InertiaProps<{ task: TaskDetail }>) {
  const [recurrence, setRecurrence] = useState<Recurrence | ''>(task.recurrence ?? '')

  return (
    <Page
      title={task.title}
      breadcrumb={
        <Link route="lists" className="hover:text-ink hover:underline">
          Listes › À faire
        </Link>
      }
      actions={
        <>
          <Button
            variant={task.done ? 'secondary' : 'primary'}
            onClick={() => router.patch(urlFor('tasks.toggle', { id: task.id }))}
          >
            <Check size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {task.done ? 'Rouvrir' : 'Marquer fait'}
          </Button>
          <DeleteButton
            href={urlFor('tasks.destroy', { id: task.id })}
            label="Supprimer cette tâche ?"
          />
        </>
      }
    >
      {task.source && (
        <Callout title="Tâche créée automatiquement">
          Elle se cochera toute seule une fois le nécessaire fait.{' '}
          <a href={task.source.href} className="underline">
            {task.source.label}
          </a>
        </Callout>
      )}

      <Form route="tasks.update" routeParams={{ id: task.id }} options={{ preserveScroll: true }}>
        {({ errors, processing }) => (
          <div className="flex max-w-xl flex-col gap-5">
            <Input label="Tâche" name="title" defaultValue={task.title} error={errors.title} />
            {task.isChore && (
              <Input
                label="Pièce"
                name="room"
                defaultValue={task.room ?? ''}
                placeholder="Optionnel"
                hint="Tâche ménagère, visible sur la fiche Logement."
                error={errors.room}
              />
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Date"
                name="dueOn"
                type="date"
                defaultValue={task.dueOn ?? ''}
                error={errors.dueOn}
              />
              <Input
                label="Heure"
                name="dueTime"
                type="time"
                defaultValue={task.dueTime ?? ''}
                error={errors.dueTime}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Select
                label="Répétition"
                name="recurrence"
                value={recurrence}
                onChange={(event) => setRecurrence(event.target.value as Recurrence | '')}
              >
                <option value="">Jamais</option>
                {RECURRENCES.map((value) => (
                  <option key={value} value={value}>
                    Tous les… {recurrenceLabels[value]}
                  </option>
                ))}
              </Select>
              {recurrence && (
                <Input
                  label={`Tous les combien (${recurrenceLabels[recurrence]})`}
                  name="recurrenceInterval"
                  type="number"
                  min={1}
                  defaultValue={task.recurrenceInterval}
                  error={errors.recurrenceInterval}
                />
              )}
            </div>
            <Select label="Domaine" name="domain" defaultValue={task.domain ?? ''}>
              <option value="">Aucun</option>
              {DOMAINS.map((domain) => (
                <option key={domain} value={domain}>
                  {domainMeta[domain].label}
                </option>
              ))}
            </Select>
            <Textarea label="Notes" name="notes" rows={4} defaultValue={task.notes ?? ''} />
            <div className="flex gap-2">
              <Button type="submit" disabled={processing}>
                Enregistrer
              </Button>
              <Link route="lists" className={buttonClasses('ghost')}>
                Retour
              </Link>
            </div>
          </div>
        )}
      </Form>

      <Checklist task={task} />
    </Page>
  )
}

TaskShow.layout = [AppShell]
