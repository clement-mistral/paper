import { Link } from '@adonisjs/inertia/react'
import { ChevronRight } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import Page from '~/components/ui/page'
import { FICHE_TYPES, ficheHref, ficheMeta } from '~/lib/fiches'
import { ICON_STROKE } from '~/lib/icons'

export default function FichesIndex() {
  return (
    <Page title="Fiches" description="Les objets du quotidien et tout ce qui s’y rattache.">
      <ul className="flex flex-col border-t border-border">
        {FICHE_TYPES.map((type) => {
          const meta = ficheMeta[type]
          return (
            <li key={type} className="border-b border-border">
              <Link
                href={ficheHref(type)}
                className="group flex min-h-14 items-center gap-3 px-1 py-2 hover:bg-callout"
              >
                <DomainIcon icon={meta.icon} domain={meta.domain} size={18} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-ink">{meta.label}</span>
                  <span className="truncate text-label text-muted">{meta.description}</span>
                </span>
                <ChevronRight
                  size={16}
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                  className="text-muted group-hover:text-ink"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </Page>
  )
}

FichesIndex.layout = [AppShell]
