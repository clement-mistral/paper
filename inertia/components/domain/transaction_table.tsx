import { ArrowLeftRight, Receipt, Trash2 } from 'lucide-react'
import { Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { urlFor } from '~/client'
import AmountCell from '~/components/domain/amount_cell'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { useMembers } from '~/lib/members'
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
  const { by } = useMembers()
  const author = (row: TransactionRow) =>
    by(row.createdById) && (
      <span className="ml-2 text-label text-muted">par {by(row.createdById)}</span>
    )
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
          <span className="inline-flex items-center gap-2">
            <ArrowLeftRight
              size={14}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="shrink-0 text-muted"
            />
            {row.label}
            <span className="sr-only">(virement)</span>
            {author(row)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <DomainDot domain={row.domain} />
            <span>
              {row.label}
              {author(row)}
            </span>
          </span>
        ),
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
                  onClick={() => confirmDelete(row)}
                  className="inline-grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              ) : null,
          },
        ]
      : []),
  ].filter((column) => !hide.includes(column.key as 'envelope' | 'account' | 'domain'))

  const empty = (
    <EmptyState icon={<Receipt size={20} strokeWidth={ICON_STROKE} />} title="Aucune transaction">
      Saisissez une dépense avec Ctrl K, par exemple « café 4,50 € ».
    </EmptyState>
  )

  return (
    <>
      {/* Small screens: one line per transaction, no horizontal scroll. */}
      <div className="sm:hidden">
        {transactions.length === 0 ? (
          empty
        ) : (
          <ul className="flex flex-col">
            {transactions.map((row) => (
              <li key={row.id} className="flex items-center gap-3 border-b border-border py-2.5">
                {row.kind === 'transfer' ? (
                  <ArrowLeftRight
                    size={14}
                    strokeWidth={ICON_STROKE}
                    aria-label="Virement"
                    className="shrink-0 text-muted"
                  />
                ) : (
                  <DomainDot domain={row.domain} />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-ink">{row.label}</span>
                  <span className="truncate text-label text-muted">
                    {[
                      formatDate(row.occurredOn),
                      hide.includes('envelope') ? null : row.envelope?.name,
                      hide.includes('account') ? null : row.account?.name,
                      by(row.createdById) ? `par ${by(row.createdById)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <AmountCell cents={row.amountCents} neutral={row.kind === 'transfer'} />
                {allowDelete && row.deletable && (
                  <button
                    type="button"
                    aria-label={`Supprimer « ${row.label} »`}
                    onClick={() => confirmDelete(row)}
                    className="-mr-2 grid size-9 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                  >
                    <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="hidden sm:block">
        <DataTable
          caption="Transactions"
          rows={transactions}
          rowKey={(row) => row.id}
          columns={columns}
          empty={empty}
        />
      </div>
    </>
  )
}

function confirmDelete(row: TransactionRow) {
  const question =
    row.kind === 'transfer'
      ? 'Supprimer ce virement (les deux comptes) ?'
      : `Supprimer « ${row.label} » ?`
  if (window.confirm(question)) {
    router.delete(urlFor('money.transactions.destroy', { id: row.id }), { preserveScroll: true })
  }
}

/** The domain of a transaction, as a coloured dot (its name for screen readers). */
function DomainDot({ domain }: { domain: TransactionRow['domain'] }) {
  return (
    <span
      title={domainMeta[domain].label}
      className={cn('size-2 shrink-0 rounded-full', domainMeta[domain].bar)}
    >
      <span className="sr-only">{domainMeta[domain].label}</span>
    </span>
  )
}
