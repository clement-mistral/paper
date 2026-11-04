import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { CalendarCheck, ChefHat, ReceiptText, Repeat, Wrench } from 'lucide-react'
import { urlFor } from '~/client'
import DomainTag from '~/components/ui/domain_tag'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { ICON_STROKE } from '~/lib/icons'
import type { AgendaItem } from '#shared/types/agenda'

const icons = {
  task: CalendarCheck,
  meal: ChefHat,
  bill: ReceiptText,
  subscription: Repeat,
  maintenance: Wrench,
  equipment_maintenance: Wrench,
} as const

/**
 * One dated item of any domain. Tasks are checked in place; the other
 * items link to their fiche.
 */
export default function AgendaItemRow({ item }: { item: AgendaItem }) {
  const Icon = icons[item.kind]
  const toggle = () =>
    item.taskId !== null &&
    router.patch(urlFor('tasks.toggle', { id: item.taskId }), {}, { preserveScroll: true })

  return (
    <li className="flex min-h-11 items-center gap-3 border-b border-border py-1.5">
      {item.taskId !== null ? (
        <input
          type="checkbox"
          aria-label={`Fait : ${item.title}`}
          checked={item.done}
          onChange={toggle}
          className="size-4 shrink-0 cursor-pointer accent-ink"
        />
      ) : (
        <Icon
          size={16}
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
          className={cn('shrink-0', domainMeta[item.domain].text)}
        />
      )}
      <span className="w-11 shrink-0 text-label text-muted tabular-nums">
        {item.time?.replace(':', 'h') ?? ''}
      </span>
      <Link
        href={item.href}
        className={cn(
          'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 hover:underline',
          item.done && 'text-muted line-through'
        )}
      >
        <span className="text-sm">{item.title}</span>
        {item.detail && <span className="text-label text-muted">{item.detail}</span>}
      </Link>
      <DomainTag domain={item.domain} className="hidden sm:inline-flex" />
    </li>
  )
}
