import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import StatusTag from '~/components/ui/status_tag'
import { ficheMeta } from '~/lib/fiches'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { billStatus } from '~/lib/labels'
import type { BillSummary } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function BillsIndex({ bills }: InertiaProps<{ bills: BillSummary[] }>) {
  const meta = ficheMeta.factures
  const toPay = bills
    .filter((bill) => bill.status !== 'paid')
    .reduce((total, bill) => total + bill.amountCents, 0)

  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="factures" />}
      description={toPay > 0 ? `${formatAmount(toPay)} à payer` : meta.description}
      actions={
        <Link route="bills.create" className={buttonClasses()}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouvelle facture
        </Link>
      }
    >
      <DataTable
        caption="Factures"
        rows={bills}
        rowKey={(bill) => bill.id}
        columns={[
          {
            key: 'provider',
            header: 'Fournisseur',
            cell: (bill) => (
              <Link
                route="bills.show"
                routeParams={{ id: bill.id }}
                className="font-medium text-ink hover:underline"
              >
                {bill.provider}
              </Link>
            ),
          },
          {
            key: 'status',
            header: 'Statut',
            cell: (bill) => (
              <StatusTag
                status={billStatus[bill.status]}
                label={
                  bill.status === 'paid' ? 'Payée' : bill.status === 'due' ? 'À payer' : undefined
                }
              />
            ),
          },
          {
            key: 'date',
            header: 'Échéance',
            cell: (bill) => (
              <span className="text-muted">{formatDate(bill.paidOn ?? bill.dueOn)}</span>
            ),
          },
          {
            key: 'amount',
            header: 'Montant',
            align: 'right',
            cell: (bill) => formatAmount(bill.amountCents),
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Aucune facture"
          >
            Avec Ctrl K : « facture EDF 84,20 € le 15 ».
          </EmptyState>
        }
      />
    </Page>
  )
}

BillsIndex.layout = [AppShell]
