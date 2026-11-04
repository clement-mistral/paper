import { Link } from '@adonisjs/inertia/react'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import StatusTag from '~/components/ui/status_tag'
import { formatAmount, formatDate } from '~/lib/format'
import { claimStatusLabels } from '~/lib/labels'
import type { Status } from '#shared/types/domain'
import { OPEN_CLAIM_STATUSES, type ClaimRow, type ClaimStatus } from '#shared/types/maison'

/**
 * Claims in progress stand out (« à déclarer » as a warning), closed ones
 * stay neutral.
 */
export function claimTone(status: ClaimStatus): Status {
  if (status === 'to_declare') return 'overdue'
  if (OPEN_CLAIM_STATUSES.includes(status)) return 'upcoming'
  if (status === 'compensated') return 'done'
  return 'planned'
}

export default function ClaimTable({ claims }: { claims: ClaimRow[] }) {
  return (
    <DataTable
      caption="Sinistres"
      rows={claims}
      rowKey={(claim) => claim.id}
      columns={[
        {
          key: 'title',
          header: 'Sinistre',
          cell: (claim) => (
            <span className="flex flex-col">
              <Link
                route="claims.show"
                routeParams={{ id: claim.id }}
                className="font-medium text-ink hover:underline"
              >
                {claim.title}
              </Link>
              <span className="text-label text-muted">
                {[formatDate(claim.occurredOn), claim.insurer].filter(Boolean).join(' · ')}
              </span>
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Statut',
          cell: (claim) => (
            <StatusTag status={claimTone(claim.status)} label={claimStatusLabels[claim.status]} />
          ),
        },
        {
          key: 'damage',
          header: 'Dégâts',
          align: 'right',
          cell: (claim) => (claim.damageCents ? formatAmount(claim.damageCents) : '—'),
        },
        {
          key: 'compensation',
          header: 'Indemnisation',
          align: 'right',
          cell: (claim) => (claim.compensationCents ? formatAmount(claim.compensationCents) : '—'),
        },
      ]}
      empty={<EmptyState title="Aucun sinistre" />}
    />
  )
}
