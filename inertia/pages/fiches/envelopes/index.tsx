import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import EnvelopeProgress from '~/components/domain/envelope_progress'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import { ficheMeta } from '~/lib/fiches'
import { ICON_STROKE } from '~/lib/icons'
import type { EnvelopeSummary } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function EnvelopesIndex({
  envelopes,
}: InertiaProps<{ envelopes: EnvelopeSummary[] }>) {
  const meta = ficheMeta.enveloppes
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="enveloppes" />}
      description={meta.description}
      actions={
        <Link route="envelopes.create" className={buttonClasses()}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouvelle enveloppe
        </Link>
      }
    >
      {envelopes.length === 0 ? (
        <EmptyState
          icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
          title="Aucune enveloppe pour l’instant"
        >
          Créez « Resto » avec les mots-clés « restaurant, mcdo » : « resto 32 € » y sera rangé
          automatiquement.
        </EmptyState>
      ) : (
        <ul className="flex flex-col border-t border-border">
          {envelopes.map((envelope) => (
            <li key={envelope.id} className="border-b border-border">
              <Link
                route="envelopes.show"
                routeParams={{ id: envelope.id }}
                className="grid grid-cols-1 items-center gap-2 px-1 py-3 hover:bg-callout sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-8"
              >
                <span className="text-sm font-medium text-ink">{envelope.name}</span>
                <EnvelopeProgress envelope={envelope} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

EnvelopesIndex.layout = [AppShell]
