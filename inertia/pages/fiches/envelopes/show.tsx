import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import ColumnChart from '~/components/charts/column_chart'
import EnvelopeProgress from '~/components/domain/envelope_progress'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import TransactionTable from '~/components/domain/transaction_table'
import { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import { formatAmount, formatAxisAmount, formatMonthLong, formatMonthShort } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { EnvelopeDetail, MonthlyAmount, TransactionRow } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function EnvelopeShow({
  envelope,
  transactions,
  monthlySpending,
}: InertiaProps<{
  envelope: EnvelopeDetail
  transactions: TransactionRow[]
  monthlySpending: MonthlyAmount[]
}>) {
  return (
    <Page
      title={envelope.name}
      breadcrumb={<FicheBreadcrumb type="enveloppes" />}
      actions={
        <>
          <Link
            route="envelopes.edit"
            routeParams={{ id: envelope.id }}
            className={buttonClasses('secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Modifier
          </Link>
          <DeleteButton
            href={urlFor('envelopes.destroy', { id: envelope.id })}
            label="Les transactions seront conservées, sans enveloppe."
          />
        </>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="budget" /> },
          {
            label: 'Budget mensuel',
            value:
              envelope.monthlyBudgetCents > 0 ? formatAmount(envelope.monthlyBudgetCents) : '—',
          },
          {
            label: 'Ce mois-ci',
            value: (
              <div className="max-w-xs">
                <EnvelopeProgress envelope={envelope} />
              </div>
            ),
          },
          {
            label: 'Mots-clés',
            value: (
              <span className="flex flex-wrap gap-1">
                {[envelope.name.toLowerCase(), ...envelope.keywords].map((keyword) => (
                  <span key={keyword} className="rounded-tag bg-callout px-1.5 py-0.5 text-xs">
                    {keyword}
                  </span>
                ))}
              </span>
            ),
          },
          ...(envelope.notes ? [{ label: 'Notes', value: envelope.notes }] : []),
        ]}
      />

      <Section title="Dépenses par mois">
        <ColumnChart
          title={`Dépenses « ${envelope.name} » des 12 derniers mois`}
          domain="budget"
          data={monthlySpending.map(({ month, cents }) => ({
            key: month,
            label: formatMonthShort(month),
            detail: formatMonthLong(month),
            value: cents,
          }))}
          format={formatAmount}
          formatAxis={formatAxisAmount}
          reference={
            envelope.monthlyBudgetCents > 0
              ? {
                  value: envelope.monthlyBudgetCents,
                  label: `Budget mensuel : ${formatAmount(envelope.monthlyBudgetCents)}`,
                }
              : undefined
          }
        />
      </Section>

      <Section title="Mentionnée dans">
        <TransactionTable transactions={transactions} hide={['envelope']} />
      </Section>
    </Page>
  )
}

EnvelopeShow.layout = [AppShell]
