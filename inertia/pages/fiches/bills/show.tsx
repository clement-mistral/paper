import { Form, Link } from '@adonisjs/inertia/react'
import { Check, Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import StatusTag from '~/components/ui/status_tag'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { billStatus } from '~/lib/labels'
import type { BillDetail, BudgetOptions } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function BillShow({
  bill,
  options,
}: InertiaProps<{ bill: BillDetail; options: BudgetOptions }>) {
  const envelope = options.envelopes.find(({ id }) => id === bill.envelopeId)
  const account = options.accounts.find(({ id }) => id === bill.accountId)

  return (
    <Page
      title={`Facture ${bill.provider}`}
      breadcrumb={<FicheBreadcrumb type="factures" />}
      actions={
        <>
          {bill.status !== 'paid' && (
            <Form route="bills.pay" routeParams={{ id: bill.id }}>
              {({ processing }) => (
                <Button type="submit" disabled={processing}>
                  <Check size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  Marquer payée
                </Button>
              )}
            </Form>
          )}
          <Link
            route="bills.edit"
            routeParams={{ id: bill.id }}
            className={buttonClasses('secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Modifier
          </Link>
          <DeleteButton
            href={urlFor('bills.destroy', { id: bill.id })}
            label="La dépense éventuelle reste dans Budget."
          />
        </>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="maison" /> },
          {
            label: 'Statut',
            value: (
              <StatusTag
                status={billStatus[bill.status]}
                label={
                  bill.status === 'paid' ? 'Payée' : bill.status === 'due' ? 'À payer' : undefined
                }
              />
            ),
          },
          { label: 'Montant', value: formatAmount(bill.amountCents) },
          { label: 'Échéance', value: formatDate(bill.dueOn) },
          ...(bill.paidOn ? [{ label: 'Payée le', value: formatDate(bill.paidOn) }] : []),
          { label: 'Enveloppe', value: envelope?.name ?? '—' },
          { label: 'Compte', value: account?.name ?? '—' },
          ...(bill.notes ? [{ label: 'Notes', value: bill.notes }] : []),
        ]}
      />
    </Page>
  )
}

BillShow.layout = [AppShell]
