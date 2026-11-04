import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Textarea from '~/components/ui/textarea'
import { centsToInput } from '~/lib/format'
import type { BillDetail, BudgetOptions } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function BillForm({
  bill,
  options,
}: InertiaProps<{ bill: BillDetail | null; options: BudgetOptions }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Fournisseur"
        name="provider"
        defaultValue={bill?.provider}
        placeholder="EDF"
        error={errors.provider}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Montant"
          name="amount"
          inputMode="decimal"
          defaultValue={bill ? centsToInput(bill.amountCents) : ''}
          placeholder="84,20"
          error={errors.amount}
        />
        <Input
          label="Échéance"
          name="dueOn"
          type="date"
          defaultValue={bill?.dueOn ?? new Date().toISOString().slice(0, 10)}
          error={errors.dueOn}
        />
      </div>
      <BudgetSelects
        options={options}
        envelopeId={bill?.envelopeId}
        accountId={bill?.accountId}
        errors={errors}
      />
      <Textarea label="Notes" name="notes" defaultValue={bill?.notes ?? ''} error={errors.notes} />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {bill ? 'Enregistrer' : 'Créer la facture'}
        </Button>
        {bill ? (
          <Link route="bills.show" routeParams={{ id: bill.id }} className={buttonClasses('ghost')}>
            Annuler
          </Link>
        ) : (
          <Link route="bills.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={bill ? `Modifier la facture ${bill.provider}` : 'Nouvelle facture'}
      breadcrumb={<FicheBreadcrumb type="factures" />}
    >
      {bill ? (
        <Form route="bills.update" routeParams={{ id: bill.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="bills.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

BillForm.layout = [AppShell]
