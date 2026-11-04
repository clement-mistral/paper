import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { ShoppingBasket, X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import TaskList from '~/components/domain/task_list'
import Button from '~/components/ui/button'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import { cn } from '~/lib/cn'
import { formatDecimal } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { ShoppingItemRow, TaskRow } from '#shared/types/lists'
import type { PantryRow } from '#shared/types/menu'
import PantrySection from '~/components/domain/pantry_section'
import type { InertiaProps } from '~/types'

function quantity(item: ShoppingItemRow): string | null {
  if (item.quantity === null) return null
  const unit = item.unit && item.unit !== 'piece' ? ` ${item.unit}` : ''
  return `${formatDecimal(item.quantity)}${unit}`
}

function ShoppingList({ items }: { items: ShoppingItemRow[] }) {
  const [label, setLabel] = useState('')
  const hasChecked = items.some((item) => item.checked)

  return (
    <Section title="Courses">
      <Form
        route="shopping.store"
        options={{ preserveScroll: true }}
        onSuccess={() => setLabel('')}
        className="flex gap-2"
      >
        {({ processing }) => (
          <>
            <label htmlFor="shopping-label" className="sr-only">
              Ajouter un article
            </label>
            <input
              id="shopping-label"
              name="label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ajouter un article…"
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
            />
            <Button type="submit" variant="secondary" disabled={processing || label.trim() === ''}>
              Ajouter
            </Button>
          </>
        )}
      </Form>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasket size={20} strokeWidth={ICON_STROKE} />}
          title="Liste vide"
        >
          Les ingrédients des repas planifiés s’ajoutent automatiquement. Avec Ctrl K : « ajoute du
          lait aux courses ».
        </EmptyState>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex min-h-10 items-center gap-3 border-b border-border py-1"
            >
              <input
                id={`shopping-${item.id}`}
                type="checkbox"
                checked={item.checked}
                onChange={() =>
                  router.patch(
                    urlFor('shopping.toggle', { id: item.id }),
                    {},
                    { preserveScroll: true }
                  )
                }
                className="size-4 shrink-0 cursor-pointer accent-ink"
              />
              <label
                htmlFor={`shopping-${item.id}`}
                className={cn(
                  'flex min-w-0 flex-1 cursor-pointer flex-wrap items-baseline gap-x-2',
                  item.checked && 'text-muted line-through'
                )}
              >
                <span className="text-sm">{item.label}</span>
                {quantity(item) && <span className="text-label text-muted">{quantity(item)}</span>}
                {item.reason && <span className="text-xs text-muted">{item.reason}</span>}
              </label>
              {item.reasonDomain && <DomainTag domain={item.reasonDomain} />}
              <button
                type="button"
                aria-label={`Retirer ${item.label}`}
                onClick={() =>
                  router.delete(urlFor('shopping.destroy', { id: item.id }), {
                    preserveScroll: true,
                  })
                }
                className="grid size-8 place-items-center rounded-control text-muted opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-ink focus:opacity-100"
              >
                <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasChecked && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.delete(urlFor('shopping.clear'), { preserveScroll: true })}
          >
            Retirer les articles cochés
          </Button>
        </div>
      )}
    </Section>
  )
}

export default function Lists({
  shopping,
  tasks,
  pantry,
}: InertiaProps<{ shopping: ShoppingItemRow[]; tasks: TaskRow[]; pantry: PantryRow[] }>) {
  return (
    <Page title="Listes" description="Remplies automatiquement par les autres domaines.">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8">
        <TaskList tasks={tasks} />
        <ShoppingList items={shopping} />
      </div>
      <PantrySection rows={pantry} />
    </Page>
  )
}

Lists.layout = [AppShell]
