import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import { claimTone } from '~/components/domain/claim_table'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import StatusTag from '~/components/ui/status_tag'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { claimStatusLabels } from '~/lib/labels'
import type { ClaimDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ClaimShow({ claim }: InertiaProps<{ claim: ClaimDetail }>) {
  const amount = (label: string, cents: number | null) =>
    cents ? [{ label, value: formatAmount(cents) }] : []
  const date = (label: string, value: string | null) =>
    value ? [{ label, value: formatDate(value) }] : []
  const remaining =
    claim.damageCents !== null && claim.compensationCents !== null
      ? claim.damageCents - claim.compensationCents
      : null

  return (
    <Page
      title={claim.title}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={
        <Link
          route="homes.show"
          routeParams={{ id: claim.homeId }}
          className="hover:text-ink hover:underline"
        >
          Logement
        </Link>
      }
      actions={
        <Link
          route="claims.edit"
          routeParams={{ id: claim.id }}
          className={buttonClasses('secondary')}
        >
          <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Modifier
        </Link>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="maison" /> },
          {
            label: 'Statut',
            value: (
              <StatusTag status={claimTone(claim.status)} label={claimStatusLabels[claim.status]} />
            ),
          },
          ...date('Survenu le', claim.occurredOn),
          ...(claim.contract
            ? [
                {
                  label: 'Assurance',
                  value: (
                    <Link
                      route="contracts.show"
                      routeParams={{ id: claim.contract.id }}
                      className="hover:underline"
                    >
                      {claim.contract.name}
                    </Link>
                  ),
                },
              ]
            : []),
          ...(claim.claimNumber ? [{ label: 'Numéro', value: claim.claimNumber }] : []),
          ...date('Déclaré le', claim.declaredOn),
          ...amount('Dégâts', claim.damageCents),
          ...amount('Franchise', claim.deductibleCents),
          ...amount('Indemnisation', claim.compensationCents),
          ...date('Indemnisé le', claim.compensatedOn),
          ...(remaining !== null && remaining > 0
            ? [{ label: 'Reste à charge', value: formatAmount(remaining) }]
            : []),
          ...(claim.notes
            ? [
                {
                  label: 'Notes',
                  value: <span className="whitespace-pre-line">{claim.notes}</span>,
                },
              ]
            : []),
        ]}
      />
    </Page>
  )
}

ClaimShow.layout = [AppShell]
