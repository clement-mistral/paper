import { useState } from 'react'
import AppShell from '~/layouts/app_shell'
import AgendaItemRow from '~/components/domain/agenda_item_row'
import Page from '~/components/ui/page'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { formatLongDate } from '~/lib/format'
import { DOMAINS, type Domain } from '#shared/types/domain'
import type { AgendaOverview } from '#shared/types/agenda'
import type { InertiaProps } from '~/types'

type Day = AgendaOverview['days'][number]
type Block = { kind: 'day'; day: Day; index: number } | { kind: 'free'; from: string; to: string }

/**
 * Days with something, one section each; the empty days in between are
 * folded into one line (« Du mercredi 18 au samedi 21 : rien de prévu »).
 * Today and tomorrow always have their section.
 */
function blocks(days: Day[]): Block[] {
  const result: Block[] = []
  days.forEach((day, index) => {
    if (day.items.length > 0 || index < 2) {
      result.push({ kind: 'day', day, index })
      return
    }
    const last = result.at(-1)
    if (last?.kind === 'free') last.to = day.date
    else result.push({ kind: 'free', from: day.date, to: day.date })
  })
  return result
}

export default function Agenda({ agenda }: InertiaProps<{ agenda: AgendaOverview }>) {
  const [active, setActive] = useState<Domain[]>([...DOMAINS])

  const toggle = (domain: Domain) =>
    setActive((current) =>
      current.includes(domain) ? current.filter((d) => d !== domain) : [...current, domain]
    )

  const days = agenda.days.map((day) => ({
    ...day,
    items: day.items.filter((item) => active.includes(item.domain)),
  }))

  return (
    <Page title="Agenda" description="Les 14 prochains jours, tous domaines confondus.">
      <div role="group" aria-label="Filtrer par domaine" className="flex flex-wrap gap-2">
        {DOMAINS.map((domain) => {
          const on = active.includes(domain)
          return (
            <button
              key={domain}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(domain)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-control border px-2.5 text-label transition-colors',
                on ? 'border-border bg-bg text-ink' : 'border-transparent bg-callout text-muted'
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', on ? domainMeta[domain].bar : 'bg-border')}
              />
              {domainMeta[domain].label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-8">
        {blocks(days).map((block) =>
          block.kind === 'free' ? (
            <p
              key={block.from}
              className="-my-3 flex items-center gap-3 border-l-2 border-dashed border-border py-1 pl-3 text-label text-muted"
            >
              {block.from === block.to
                ? `${formatLongDate(block.from)} : rien de prévu`
                : `Du ${formatLongDate(block.from).toLowerCase()} au ${formatLongDate(block.to).toLowerCase()} : rien de prévu`}
            </p>
          ) : (
            <section key={block.day.date} className="flex flex-col gap-1">
              <h2
                className={cn(
                  'flex items-baseline gap-2 border-b border-border pb-2 text-base font-semibold',
                  block.index === 0 && 'text-accent-ink'
                )}
              >
                {block.index === 0
                  ? 'Aujourd’hui'
                  : block.index === 1
                    ? 'Demain'
                    : formatLongDate(block.day.date)}
                {block.index < 2 && (
                  <span className="text-label font-normal text-muted">
                    {formatLongDate(block.day.date)}
                  </span>
                )}
              </h2>
              {block.day.items.length === 0 ? (
                <p className="py-2 text-label text-muted">Rien de prévu.</p>
              ) : (
                <ul className="flex flex-col">
                  {block.day.items.map((item) => (
                    <AgendaItemRow key={item.key} item={item} />
                  ))}
                </ul>
              )}
            </section>
          )
        )}
      </div>
    </Page>
  )
}

Agenda.layout = [AppShell]
