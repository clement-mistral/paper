import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import TransactionTable from '~/components/domain/transaction_table'
import { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { MONTHS, frequencyLabels } from '~/lib/labels'
import type { TransactionRow } from '#shared/types/budget'
import type { BudgetOptions, SubscriptionDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function SubscriptionShow({
  subscription,
  charges,
  options,
}: InertiaProps<{
  subscription: SubscriptionDetail
  charges: TransactionRow[]
  options: BudgetOptions
}>) {
  const envelope = options.envelopes.find(({ id }) => id === subscription.envelopeId)
  const account = options.accounts.find(({ id }) => id === subscription.accountId)
  const schedule =
    subscription.frequency === 'yearly'
      ? `Le ${subscription.billingDay} ${MONTHS[(subscription.billingMonth ?? 1) - 1]}`
      : `Le ${subscription.billingDay} de chaque mois`

  return (
    <Page
      title={subscription.name}
      breadcrumb={<FicheBreadcrumb type="abonnements" />}
      actions={
        <>
          <Link
            route="subscriptions.edit"
            routeParams={{ id: subscription.id }}
            className={buttonClasses('secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Modifier
          </Link>
          <DeleteButton
            href={urlFor('subscriptions.destroy', { id: subscription.id })}
            label="Les prélèvements passés restent dans Budget."
          />
        </>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="maison" /> },
          {
            label: 'Statut',
            value: subscription.isActive ? (
              <StatusTag status="planned" label="Actif" />
            ) : (
              <StatusTag status="done" label="Arrêté" />
            ),
          },
          {
            label: 'Prix',
            value: `${formatAmount(subscription.priceCents)} · ${frequencyLabels[subscription.frequency].toLowerCase()}`,
          },
          { label: 'Prélèvement', value: schedule },
          {
            label: 'Prochain',
            value: subscription.isActive ? formatDate(subscription.nextBillingOn) : '—',
          },
          { label: 'Coût mensuel', value: formatAmount(subscription.monthlyCostCents) },
          { label: 'Enveloppe', value: envelope?.name ?? '—' },
          { label: 'Compte', value: account?.name ?? '—' },
          ...(subscription.notes ? [{ label: 'Notes', value: subscription.notes }] : []),
        ]}
      />

      <Section title="Prélèvements">
        <TransactionTable transactions={charges} hide={['envelope', 'account', 'domain']} />
      </Section>
    </Page>
  )
}

SubscriptionShow.layout = [AppShell]
