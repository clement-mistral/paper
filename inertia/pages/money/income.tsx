import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import { todayIso } from '~/lib/format'
import type { BudgetOptions } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function IncomeForm({ options }: InertiaProps<{ options: BudgetOptions }>) {
  return (
    <Page
      title="Entrée d’argent"
      description="Salaire, remboursement, vente… Avec Ctrl K : « salaire 2 100 € »."
      breadcrumb={
        <Link route="money" className="hover:text-ink hover:underline">
          Argent
        </Link>
      }
    >
      <Form route="money.income.store">
        {({ errors, processing }) => (
          <div className="flex max-w-xl flex-col gap-5">
            <Input
              label="Libellé"
              name="label"
              placeholder="Salaire"
              error={errors.label}
              autoFocus
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Montant"
                name="amount"
                inputMode="decimal"
                placeholder="2 100,00"
                error={errors.amount}
              />
              <Input
                label="Date"
                name="occurredOn"
                type="date"
                defaultValue={todayIso()}
                error={errors.occurredOn}
              />
              <Select
                label="Sur le compte"
                name="accountId"
                defaultValue={options.accounts[0]?.id ?? ''}
                error={errors.accountId}
              >
                <option value="">Aucun compte</option>
                {options.accounts.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                label="Enveloppe"
                name="envelopeId"
                defaultValue=""
                hint="Seulement pour un remboursement : il réduit ce que l’enveloppe a dépensé."
                error={errors.envelopeId}
              >
                <option value="">Aucune</option>
                {options.envelopes.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={processing}>
                Enregistrer l’entrée
              </Button>
              <Link route="money" className={buttonClasses('ghost')}>
                Annuler
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

IncomeForm.layout = [AppShell]
