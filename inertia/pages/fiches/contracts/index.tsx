import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import { ficheMeta } from '~/lib/fiches'
import { ICON_STROKE } from '~/lib/icons'
import { contractCategoryLabels } from '~/lib/labels'
import ContractStatus from '~/components/domain/contract_status'
import type { ContractRow } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ContractsIndex({ contracts }: InertiaProps<{ contracts: ContractRow[] }>) {
  const meta = ficheMeta.contrats
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="contrats" />}
      description={meta.description}
      actions={
        <Link route="contracts.create" className={buttonClasses()}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouveau contrat
        </Link>
      }
    >
      <DataTable
        caption="Contrats"
        rows={contracts}
        rowKey={(contract) => contract.id}
        columns={[
          {
            key: 'name',
            header: 'Contrat',
            cell: (contract) => (
              <span className="flex flex-col">
                <Link
                  route="contracts.show"
                  routeParams={{ id: contract.id }}
                  className="font-medium text-ink hover:underline"
                >
                  {contract.name}
                </Link>
                <span className="text-label text-muted">
                  {[contractCategoryLabels[contract.category], contract.provider]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            ),
          },
          {
            key: 'domain',
            header: 'Domaine',
            cell: (contract) => <DomainTag domain={contract.domain} />,
          },
          {
            key: 'notice',
            header: 'Échéance',
            cell: (contract) => <ContractStatus contract={contract} />,
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Aucun contrat pour l’instant"
          >
            Box, électricité, assurance habitation, mutuelle… avec leur date de préavis.
          </EmptyState>
        }
      />
    </Page>
  )
}

ContractsIndex.layout = [AppShell]
