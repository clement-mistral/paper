import { Link } from '@adonisjs/inertia/react'
import DataTable from '~/components/ui/data_table'
import { cn } from '~/lib/cn'
import { formatPercent, formatQuantity, formatUnitPrice } from '~/lib/budget'
import { formatAmount, formatDate } from '~/lib/format'
import type { AllocationSlice, HoldingRow } from '#shared/types/budget'

/** A change in green or red; a dash when unknown. */
export function Percent({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn('text-muted', className)}>—</span>
  const rounded = Number(value.toFixed(1))
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        rounded > 0 ? 'text-success' : rounded < 0 ? 'text-danger' : 'text-muted',
        className
      )}
    >
      {formatPercent(value)}
    </span>
  )
}

/** A gain in green, a loss in red, signed. */
export function Gain({ cents, className }: { cents: number | null; className?: string }) {
  if (cents === null) return <span className={cn('text-muted', className)}>—</span>
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        cents > 0 ? 'text-success' : cents < 0 ? 'text-danger' : 'text-muted',
        className
      )}
    >
      {cents > 0 ? '+' : ''}
      {formatAmount(cents)}
    </span>
  )
}

/**
 * Literal classes, for Tailwind to see them, in the allocation's order:
 * shades of Budget's gold, then of ink (domain colors mean domains).
 */
const SLICE_COLORS = [
  'bg-budget-ink',
  'bg-budget',
  'bg-ink/70',
  'bg-ink/45',
  'bg-ink/25',
  'bg-ink/12',
  'bg-budget-soft',
  'bg-ink/5',
]

/** One bar split by class, and its legend with the amounts. */
export function AllocationBar({ slices }: { slices: AllocationSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.cents, 0)
  if (total <= 0) return null
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Répartition : ${slices
          .map((slice) => `${slice.label} ${Math.round((slice.cents / total) * 100)} %`)
          .join(', ')}`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-callout"
      >
        {slices.map((slice, index) => (
          <span
            key={slice.key}
            className={cn('h-full', SLICE_COLORS[index % SLICE_COLORS.length])}
            style={{ width: `${(slice.cents / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {slices.map((slice, index) => (
          <li key={slice.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                SLICE_COLORS[index % SLICE_COLORS.length]
              )}
            />
            <span className="min-w-0 flex-1 text-ink">{slice.label}</span>
            <span className="text-muted tabular-nums">
              {Math.round((slice.cents / total) * 100)} %
            </span>
            <span className="w-28 text-right text-ink tabular-nums">
              {formatAmount(slice.cents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Where the price of a line comes from, and when it is old. */
export function PriceNote({ holding }: { holding: HoldingRow }) {
  if (holding.priceSource === 'cost') {
    return <span className="text-label text-danger">sans cours : valorisé au prix d’achat</span>
  }
  return (
    <span className={cn('text-label', holding.stale ? 'text-danger' : 'text-muted')}>
      {holding.priceSource === 'manual' ? 'valeur saisie' : 'cours'}
      {holding.priceOn ? ` du ${formatDate(holding.priceOn)}` : ''}
      {holding.stale ? ' · à mettre à jour' : ''}
    </span>
  )
}

/** The lines of an account with their value and gains. */
export function HoldingsTable({ holdings }: { holdings: HoldingRow[] }) {
  return (
    <DataTable
      caption="Lignes"
      rows={holdings}
      rowKey={(holding) => holding.id}
      columns={[
        {
          key: 'name',
          header: 'Ligne',
          cell: (holding) => (
            <span className="flex flex-col">
              <Link
                route="portfolios.holdings.show"
                routeParams={{ id: holding.id }}
                className="font-medium text-ink hover:underline"
              >
                {holding.name}
              </Link>
              <span className="text-label text-muted">
                {holding.symbol ?? 'non coté'}
                {holding.quantity > 0 && ` · ${formatQuantity(holding.quantity)} part(s)`}
              </span>
            </span>
          ),
        },
        {
          key: 'price',
          header: 'Cours',
          align: 'right',
          cell: (holding) => (
            <span className="flex flex-col items-end">
              <span className="tabular-nums">
                {holding.price === null ? '—' : formatUnitPrice(holding.price)}
              </span>
              {(holding.stale || holding.priceSource !== 'market') && (
                <PriceNote holding={holding} />
              )}
            </span>
          ),
        },
        {
          key: 'cost',
          header: 'Prix de revient',
          align: 'right',
          cell: (holding) =>
            holding.averageCost === null ? (
              <span className="text-muted">—</span>
            ) : (
              <span className="tabular-nums">{formatUnitPrice(holding.averageCost)}</span>
            ),
        },
        {
          key: 'value',
          header: 'Valeur',
          align: 'right',
          cell: (holding) => (
            <span className="whitespace-nowrap text-ink tabular-nums">
              {formatAmount(holding.valueCents)}
            </span>
          ),
        },
        {
          key: 'latent',
          header: 'Plus-value',
          align: 'right',
          cell: (holding) => (
            <span className="flex flex-col items-end">
              <Gain cents={holding.latentCents} />
              <Percent value={holding.latentPercent} className="text-label" />
            </span>
          ),
        },
        {
          key: 'ytd',
          header: 'Depuis janv.',
          align: 'right',
          cell: (holding) => <Percent value={holding.ytdPercent} />,
        },
        {
          key: 'weight',
          header: 'Poids',
          align: 'right',
          cell: (holding) => (
            <span className="text-muted tabular-nums">{Math.round(holding.weight * 100)} %</span>
          ),
        },
      ]}
    />
  )
}
