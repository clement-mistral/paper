import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import LineChart from '~/components/charts/line_chart'
import AmountCell from '~/components/domain/amount_cell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import TransactionTable from '~/components/domain/transaction_table'
import { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import { accountTypeLabels } from '~/lib/budget'
import {
  formatAmount,
  formatAxisAmount,
  formatDate,
  formatMonthLong,
  formatMonthShort,
} from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import {
  WRAPPER_LABELS,
  type AccountDetail,
  type MonthlyAmount,
  type TransactionRow,
} from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function AccountShow({
  account,
  transactions,
  balanceHistory,
}: InertiaProps<{
  account: AccountDetail
  transactions: TransactionRow[]
  balanceHistory: MonthlyAmount[]
}>) {
  /**
   * Each balance sits at the end of its month (today for the current one).
   */
  const balancePoints = balanceHistory.map(({ month, cents }, index) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
    const isCurrent = index === balanceHistory.length - 1
    return {
      key: month,
      date: end,
      value: cents,
      detail: isCurrent ? 'Aujourd’hui' : `Fin ${formatMonthLong(month).toLowerCase()}`,
    }
  })

  return (
    <Page
      title={account.name}
      breadcrumb={<FicheBreadcrumb type="comptes" />}
      actions={
        <>
          {(account.type === 'investment' || (account.wrapper && account.wrapper !== 'livret')) && (
            <Link
              route="portfolios.show"
              routeParams={{ id: account.id }}
              className={buttonClasses('secondary')}
            >
              Voir les lignes
            </Link>
          )}
          <Link
            route="accounts.edit"
            routeParams={{ id: account.id }}
            className={buttonClasses('secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Modifier
          </Link>
          <DeleteButton
            href={urlFor('accounts.destroy', { id: account.id })}
            label="Les transactions seront conservées, sans compte."
          />
        </>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="budget" /> },
          { label: 'Type', value: accountTypeLabels[account.type] },
          ...(account.wrapper
            ? [{ label: 'Enveloppe', value: WRAPPER_LABELS[account.wrapper] }]
            : []),
          ...(account.openedOn
            ? [{ label: 'Ouvert le', value: formatDate(account.openedOn) }]
            : []),
          { label: 'Banque', value: account.institution ?? '—' },
          {
            label: 'Solde',
            value: <AmountCell cents={account.balanceCents} className="font-medium text-ink" />,
          },
          { label: 'Solde initial', value: formatAmount(account.openingBalanceCents) },
          { label: 'Par défaut', value: account.isDefault ? 'Oui' : 'Non' },
          ...(account.notes ? [{ label: 'Notes', value: account.notes }] : []),
        ]}
      />

      <Section title="Solde">
        <LineChart
          title={`Solde de ${account.name} sur 12 mois`}
          domain="budget"
          data={balancePoints}
          format={formatAmount}
          formatAxis={formatAxisAmount}
          formatTick={(date) => formatMonthShort(date.slice(0, 7))}
          tableHeader={['Date', 'Solde']}
        />
      </Section>

      <Section title={`Mentionné dans · ${account.transactionCount} transaction(s)`}>
        <TransactionTable transactions={transactions} hide={['account']} />
      </Section>
    </Page>
  )
}

AccountShow.layout = [AppShell]
