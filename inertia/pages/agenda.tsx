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
        {days.map((day, index) => (
          <section key={day.date} className="flex flex-col gap-1">
            <h2 className="flex items-baseline gap-2 border-b border-border pb-2 text-base font-semibold">
              {index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : formatLongDate(day.date)}
              {index < 2 && (
                <span className="text-label font-normal text-muted">
                  {formatLongDate(day.date)}
                </span>
              )}
            </h2>
            {day.items.length === 0 ? (
              <p className="py-2 text-label text-muted">—</p>
            ) : (
              <ul className="flex flex-col">
                {day.items.map((item) => (
                  <AgendaItemRow key={item.key} item={item} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Page>
  )
}

Agenda.layout = [AppShell]
