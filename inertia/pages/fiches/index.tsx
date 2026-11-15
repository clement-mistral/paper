import { Link } from '@adonisjs/inertia/react'
import { ChevronRight } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import Page from '~/components/ui/page'
import { FICHE_TYPES, ficheHref, ficheMeta } from '~/lib/fiches'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { ICON_STROKE } from '~/lib/icons'
import { DOMAINS } from '#shared/types/domain'

/**
 * Every kind of fiche, grouped by domain, each on its colour.
 */
export default function FichesIndex() {
  const groups = DOMAINS.map((domain) => ({
    domain,
    types: FICHE_TYPES.filter((type) => ficheMeta[type].domain === domain),
  })).filter((group) => group.types.length > 0)

  return (
    <Page title="Fiches" description="Les objets du quotidien et tout ce qui s’y rattache.">
      {groups.map(({ domain, types }) => (
        <section key={domain} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-label font-medium text-muted">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', domainMeta[domain].bar)}
            />
            {domainMeta[domain].label}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {types.map((type) => {
              const meta = ficheMeta[type]
              return (
                <li key={type}>
                  <Link
                    href={ficheHref(type)}
                    className="group flex h-full items-center gap-3 rounded-card border border-border p-3 transition-colors hover:border-transparent hover:bg-callout"
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-card',
                        domainMeta[meta.domain].soft
                      )}
                    >
                      <DomainIcon icon={meta.icon} domain={meta.domain} size={19} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-ink">{meta.label}</span>
                      <span className="line-clamp-2 text-label text-muted">{meta.description}</span>
                    </span>
                    <ChevronRight
                      size={16}
                      strokeWidth={ICON_STROKE}
                      aria-hidden="true"
                      className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </Page>
  )
}

FichesIndex.layout = [AppShell]
