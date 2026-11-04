import { ArrowLeftRight, Receipt, Trash2 } from 'lucide-react'
import { Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { urlFor } from '~/client'
import AmountCell from '~/components/domain/amount_cell'
import DataTable from '~/components/ui/data_table'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import { formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { TransactionRow } from '#shared/types/budget'

/**
 * Transactions with their envelope and account. Columns already implied
 * by the page (the envelope on an envelope fiche…) can be hidden.
 */
export default function TransactionTable({
  transactions,
  hide = [],
  allowDelete = false,
}: {
  transactions: TransactionRow[]
  hide?: Array<'envelope' | 'account' | 'domain'>
  /** Offer to delete what was typed by hand (and transfers). */
  allowDelete?: boolean
}) {
  const columns = [
    {
      key: 'date',
      header: 'Date',
      cell: (row: TransactionRow) => (
        <span className="whitespace-nowrap text-muted">{formatDate(row.occurredOn)}</span>
      ),
    },
    {
      key: 'label',
      header: 'Libellé',
      cell: (row: TransactionRow) =>
        row.kind === 'transfer' ? (
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftRight
              size={14}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="shrink-0 text-muted"
            />
            {row.label}
            <span className="sr-only">(virement)</span>
          </span>
        ) : (
          row.label
        ),
    },
    {
      key: 'domain',
      header: 'Domaine',
      cell: (row: TransactionRow) => <DomainTag domain={row.domain} />,
    },
    {
      key: 'envelope',
      header: 'Enveloppe',
      cell: (row: TransactionRow) =>
        row.envelope ? (
          <Link
            route="envelopes.show"
            routeParams={{ id: row.envelope.id }}
            className="hover:underline"
          >
            {row.envelope.name}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'account',
      header: 'Compte',
      cell: (row: TransactionRow) =>
        row.account ? (
          <Link
            route="accounts.show"
            routeParams={{ id: row.account.id }}
            className="hover:underline"
          >
            {row.account.name}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'amount',
      header: 'Montant',
      align: 'right' as const,
      cell: (row: TransactionRow) => (
        <AmountCell cents={row.amountCents} neutral={row.kind === 'transfer'} />
      ),
    },
    ...(allowDelete
      ? [
          {
            key: 'delete',
            header: 'Supprimer',
            align: 'right' as const,
            cell: (row: TransactionRow) =>
              row.deletable ? (
                <button
                  type="button"
                  aria-label={`Supprimer « ${row.label} »`}
                  title={row.kind === 'transfer' ? 'Supprimer le virement' : 'Supprimer'}
                  onClick={() => {
                    const question =
                      row.kind === 'transfer'
                        ? 'Supprimer ce virement (les deux comptes) ?'
                        : `Supprimer « ${row.label} » ?`
                    if (window.confirm(question)) {
                      router.delete(urlFor('money.transactions.destroy', { id: row.id }), {
                        preserveScroll: true,
                      })
                    }
                  }}
                  className="inline-grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              ) : null,
          },
        ]
      : []),
  ].filter((column) => !hide.includes(column.key as 'envelope' | 'account' | 'domain'))

  return (
    <DataTable
      caption="Transactions"
      rows={transactions}
      rowKey={(row) => row.id}
      columns={columns}
      empty={
        <EmptyState
          icon={<Receipt size={20} strokeWidth={ICON_STROKE} />}
          title="Aucune transaction"
        >
          Saisissez une dépense avec Ctrl K, par exemple « café 4,50 € ».
        </EmptyState>
      }
    />
  )
}
