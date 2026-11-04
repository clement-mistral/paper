import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import Button, { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import { todayIso } from '~/lib/format'
import type { BudgetOptions } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function TransferForm({ options }: InertiaProps<{ options: BudgetOptions }>) {
  const accounts = options.accounts
  return (
    <Page
      title="Virement entre comptes"
      description="Ni une dépense ni une entrée : l’argent change seulement de compte."
      breadcrumb={
        <Link route="money" className="hover:text-ink hover:underline">
          Argent
        </Link>
      }
    >
      {accounts.length < 2 ? (
        <Callout>
          Il faut au moins deux comptes.{' '}
          <Link route="accounts.create" className="underline underline-offset-2">
            Créer un compte
          </Link>
        </Callout>
      ) : (
        <Form route="money.transfer.store">
          {({ errors, processing }) => (
            <div className="flex max-w-xl flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select
                  label="Depuis"
                  name="fromAccountId"
                  defaultValue={accounts[0].id}
                  error={errors.fromAccountId}
                >
                  {accounts.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Vers"
                  name="toAccountId"
                  defaultValue={accounts[1].id}
                  error={errors.toAccountId}
                >
                  {accounts.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Montant"
                  name="amount"
                  inputMode="decimal"
                  placeholder="200,00"
                  error={errors.amount}
                  autoFocus
                />
                <Input
                  label="Date"
                  name="occurredOn"
                  type="date"
                  defaultValue={todayIso()}
                  error={errors.occurredOn}
                />
              </div>
              <Input
                label="Libellé"
                name="label"
                placeholder="Optionnel (Épargne du mois…)"
                error={errors.label}
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={processing}>
                  Enregistrer le virement
                </Button>
                <Link route="money" className={buttonClasses('ghost')}>
                  Annuler
                </Link>
              </div>
            </div>
          )}
        </Form>
      )}
    </Page>
  )
}

TransferForm.layout = [AppShell]
