import { Link } from '@adonisjs/inertia/react'
import { ArrowLeftRight, FileText, Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import { buttonClasses } from '~/components/ui/button'
import { ICON_STROKE } from '~/lib/icons'
import ColumnChart from '~/components/charts/column_chart'
import EnvelopeProgress from '~/components/domain/envelope_progress'
import TransactionTable from '~/components/domain/transaction_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import { urlFor } from '~/client'
import { formatAmount, formatAxisAmount, formatMonthLong, formatMonthShort } from '~/lib/format'
import type { MoneyOverview } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function Money({ overview }: InertiaProps<{ overview: MoneyOverview }>) {
  const left = overview.budgetedThisMonthCents - overview.spentThisMonthCents
  const summary = [
    { label: 'Patrimoine', value: formatAmount(overview.netWorthCents) },
    { label: 'Dépensé ce mois', value: formatAmount(overview.spentThisMonthCents) },
    { label: 'Entré ce mois', value: formatAmount(overview.incomeThisMonthCents) },
    {
      label: 'Reste à dépenser',
      value: overview.budgetedThisMonthCents > 0 ? formatAmount(left) : '—',
    },
  ]

  return (
    <Page
      title="Argent"
      description="Chaque euro, d’où qu’il vienne."
      actions={
        <>
          <Link route="money.income" className={buttonClasses('secondary')}>
            <Plus size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Entrée
          </Link>
          <Link route="money.transfer" className={buttonClasses('secondary')}>
            <ArrowLeftRight size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Virement
          </Link>
          <Link route="reports.current" className={buttonClasses('ghost')}>
            <FileText size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Compte rendu
          </Link>
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {summary.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-label text-muted">{label}</dt>
            <dd className="text-2xl font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <Section title="Dépenses par mois">
        <ColumnChart
          title="Dépenses des 12 derniers mois"
          domain="budget"
          data={overview.monthlySpending.map(({ month, cents }) => ({
            key: month,
            label: formatMonthShort(month),
            detail: formatMonthLong(month),
            value: cents,
          }))}
          format={formatAmount}
          formatAxis={formatAxisAmount}
          reference={
            overview.budgetedThisMonthCents > 0
              ? {
                  value: overview.budgetedThisMonthCents,
                  label: `Budget mensuel : ${formatAmount(overview.budgetedThisMonthCents)}`,
                }
              : undefined
          }
        />
      </Section>

      <Section title="Enveloppes" action={{ label: 'Gérer', href: urlFor('envelopes.index') }}>
        {overview.envelopes.length === 0 ? (
          <EmptyState title="Aucune enveloppe">
            Les enveloppes répartissent votre budget mensuel : Courses, Carburant, Resto…
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {overview.envelopes.map((envelope) => (
              <li key={envelope.id}>
                <Link
                  route="envelopes.show"
                  routeParams={{ id: envelope.id }}
                  className="flex flex-col gap-1.5 rounded-control hover:bg-callout"
                >
                  <span className="text-sm font-medium text-ink">{envelope.name}</span>
                  <EnvelopeProgress envelope={envelope} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Transactions">
        <TransactionTable transactions={overview.transactions} allowDelete />
      </Section>
    </Page>
  )
}

Money.layout = [AppShell]
