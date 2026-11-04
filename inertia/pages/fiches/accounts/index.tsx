import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import AmountCell from '~/components/domain/amount_cell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import { accountTypeLabels } from '~/lib/budget'
import { ficheMeta } from '~/lib/fiches'
import { ICON_STROKE } from '~/lib/icons'
import type { AccountSummary } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function AccountsIndex({ accounts }: InertiaProps<{ accounts: AccountSummary[] }>) {
  const meta = ficheMeta.comptes
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="comptes" />}
      description={meta.description}
      actions={
        <Link route="accounts.create" className={buttonClasses()}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouveau compte
        </Link>
      }
    >
      <DataTable
        caption="Comptes"
        rows={accounts}
        rowKey={(account) => account.id}
        columns={[
          {
            key: 'name',
            header: 'Nom',
            cell: (account) => (
              <Link
                route="accounts.show"
                routeParams={{ id: account.id }}
                className="font-medium text-ink hover:underline"
              >
                {account.name}
                {account.isDefault && (
                  <span className="ml-2 text-label font-normal text-muted">par défaut</span>
                )}
              </Link>
            ),
          },
          { key: 'type', header: 'Type', cell: (account) => accountTypeLabels[account.type] },
          {
            key: 'institution',
            header: 'Banque',
            cell: (account) => account.institution ?? <span className="text-muted">—</span>,
          },
          {
            key: 'balance',
            header: 'Solde',
            align: 'right',
            cell: (account) => <AmountCell cents={account.balanceCents} className="text-ink" />,
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Aucun compte pour l’instant"
          >
            Ajoutez votre compte courant : les dépenses saisies avec Ctrl K y seront imputées.
          </EmptyState>
        }
      />
    </Page>
  )
}

AccountsIndex.layout = [AppShell]
