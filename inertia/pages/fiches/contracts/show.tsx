import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import ContractStatus from '~/components/domain/contract_status'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import ClaimTable from '~/components/domain/claim_table'
import { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { contractCategoryLabels } from '~/lib/labels'
import type { ContractDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ContractShow({ contract }: InertiaProps<{ contract: ContractDetail }>) {
  const optional = (label: string, value: string | null) => (value ? [{ label, value }] : [])
  const renewal = contract.tacitRenewal
    ? `Tacite, pour ${contract.renewalMonths ?? 12} mois`
    : 'Pas de reconduction tacite'

  return (
    <Page
      title={contract.name}
      breadcrumb={<FicheBreadcrumb type="contrats" />}
      actions={
        <>
          <Link
            route="contracts.edit"
            routeParams={{ id: contract.id }}
            className={buttonClasses('secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Modifier
          </Link>
          <DeleteButton
            href={urlFor('contracts.destroy', { id: contract.id })}
            label="Les sinistres liés sont conservés, sans contrat."
          />
        </>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain={contract.domain} /> },
          { label: 'Catégorie', value: contractCategoryLabels[contract.category] },
          { label: 'Échéance', value: <ContractStatus contract={contract} /> },
          ...optional('Fournisseur', contract.provider),
          ...optional('Contact', contract.contact),
          ...optional('Numéro client', contract.customerNumber),
          ...optional('Numéro de contrat', contract.contractNumber),
          ...optional('Début', contract.startedOn ? formatDate(contract.startedOn) : null),
          ...optional(
            'Fin d’engagement',
            contract.commitmentUntil ? formatDate(contract.commitmentUntil) : null
          ),
          ...(contract.commitmentUntil
            ? [
                { label: 'Reconduction', value: renewal },
                {
                  label: 'Préavis',
                  value: contract.noticeDays ? `${contract.noticeDays} jours` : 'Aucun',
                },
              ]
            : []),
          ...optional(
            'Fin de la période',
            contract.termEndsOn && !contract.ended ? formatDate(contract.termEndsOn) : null
          ),
          ...optional('Résilié le', contract.endedOn ? formatDate(contract.endedOn) : null),
          ...(contract.subscription
            ? [
                {
                  label: 'Abonnement',
                  value: (
                    <Link
                      route="subscriptions.show"
                      routeParams={{ id: contract.subscription.id }}
                      className="hover:underline"
                    >
                      {contract.subscription.name} ·{' '}
                      {formatAmount(contract.subscription.monthlyCostCents)}/mois
                    </Link>
                  ),
                },
              ]
            : []),
          ...optional('Notes', contract.notes),
        ]}
      />

      {contract.category === 'insurance' && (
        <Section
          title="Sinistres"
          action={{ label: 'Déclarer un sinistre', href: urlFor('claims.create') }}
        >
          <ClaimTable claims={contract.claims} />
        </Section>
      )}
    </Page>
  )
}

ContractShow.layout = [AppShell]
