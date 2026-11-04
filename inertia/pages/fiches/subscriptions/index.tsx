import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import { ficheMeta } from '~/lib/fiches'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { frequencyLabels } from '~/lib/labels'
import type { SubscriptionSummary } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function SubscriptionsIndex({
  subscriptions,
}: InertiaProps<{ subscriptions: SubscriptionSummary[] }>) {
  const meta = ficheMeta.abonnements
  const active = subscriptions.filter((subscription) => subscription.isActive)
  const monthly = active.reduce((total, subscription) => total + subscription.monthlyCostCents, 0)

  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="abonnements" />}
      description={meta.description}
      actions={
        <Link route="subscriptions.create" className={buttonClasses()}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouvel abonnement
        </Link>
      }
    >
      {active.length > 0 && (
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">Par mois</dt>
            <dd className="text-2xl font-semibold">{formatAmount(monthly)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">Par an</dt>
            <dd className="text-2xl font-semibold">{formatAmount(monthly * 12)}</dd>
          </div>
        </dl>
      )}

      <DataTable
        caption="Abonnements"
        rows={subscriptions}
        rowKey={(subscription) => subscription.id}
        columns={[
          {
            key: 'name',
            header: 'Nom',
            cell: (subscription) => (
              <Link
                route="subscriptions.show"
                routeParams={{ id: subscription.id }}
                className={`font-medium hover:underline ${subscription.isActive ? 'text-ink' : 'text-muted line-through'}`}
              >
                {subscription.name}
              </Link>
            ),
          },
          {
            key: 'frequency',
            header: 'Fréquence',
            cell: (subscription) => frequencyLabels[subscription.frequency],
          },
          {
            key: 'next',
            header: 'Prochain prélèvement',
            cell: (subscription) =>
              subscription.isActive ? formatDate(subscription.nextBillingOn) : '—',
          },
          {
            key: 'price',
            header: 'Prix',
            align: 'right',
            cell: (subscription) => formatAmount(subscription.priceCents),
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Aucun abonnement pour l’instant"
          >
            Avec Ctrl K : « netflix 13,49 € par mois le 5 ».
          </EmptyState>
        }
      />
    </Page>
  )
}

SubscriptionsIndex.layout = [AppShell]
