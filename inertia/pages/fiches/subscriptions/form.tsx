import { useState } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Checkbox from '~/components/ui/checkbox'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { centsToInput } from '~/lib/format'
import { MONTHS, frequencyLabels } from '~/lib/labels'
import {
  FREQUENCIES,
  type BudgetOptions,
  type Frequency,
  type SubscriptionDetail,
} from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function SubscriptionForm({
  subscription,
  options,
}: InertiaProps<{ subscription: SubscriptionDetail | null; options: BudgetOptions }>) {
  const [frequency, setFrequency] = useState<Frequency>(subscription?.frequency ?? 'monthly')

  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Nom"
        name="name"
        defaultValue={subscription?.name}
        placeholder="Netflix"
        error={errors.name}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Prix"
          name="price"
          inputMode="decimal"
          defaultValue={subscription ? centsToInput(subscription.priceCents) : ''}
          placeholder="13,49"
          error={errors.price}
        />
        <Select
          label="Fréquence"
          name="frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as Frequency)}
          error={errors.frequency}
        >
          {FREQUENCIES.map((value) => (
            <option key={value} value={value}>
              {frequencyLabels[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Jour de prélèvement"
          name="billingDay"
          type="number"
          min={1}
          max={31}
          defaultValue={subscription?.billingDay ?? new Date().getDate()}
          error={errors.billingDay}
        />
        {frequency === 'yearly' && (
          <Select
            label="Mois"
            name="billingMonth"
            defaultValue={subscription?.billingMonth ?? new Date().getMonth() + 1}
            error={errors.billingMonth}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </Select>
        )}
      </div>
      <BudgetSelects
        options={options}
        envelopeId={subscription?.envelopeId}
        accountId={subscription?.accountId}
        errors={errors}
      />
      <Checkbox
        label="Actif : les prélèvements sont enregistrés automatiquement dans Budget"
        name="isActive"
        value="true"
        defaultChecked={subscription?.isActive ?? true}
      />
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={subscription?.notes ?? ''}
        placeholder="Usage, engagement, résiliation…"
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {subscription ? 'Enregistrer' : 'Créer l’abonnement'}
        </Button>
        {subscription ? (
          <Link
            route="subscriptions.show"
            routeParams={{ id: subscription.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="subscriptions.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={subscription ? `Modifier ${subscription.name}` : 'Nouvel abonnement'}
      breadcrumb={<FicheBreadcrumb type="abonnements" />}
    >
      {subscription ? (
        <Form route="subscriptions.update" routeParams={{ id: subscription.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="subscriptions.store">
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

SubscriptionForm.layout = [AppShell]
