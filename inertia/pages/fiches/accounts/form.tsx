import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Checkbox from '~/components/ui/checkbox'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { accountTypeLabels } from '~/lib/budget'
import { centsToInput } from '~/lib/format'
import {
  ACCOUNT_TYPES,
  ACCOUNT_WRAPPERS,
  WRAPPER_LABELS,
  type AccountDetail,
} from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function AccountForm({ account }: InertiaProps<{ account: AccountDetail | null }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Nom"
        name="name"
        defaultValue={account?.name}
        placeholder="Compte joint"
        error={errors.name}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Type"
          name="type"
          defaultValue={account?.type ?? 'checking'}
          error={errors.type}
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {accountTypeLabels[type]}
            </option>
          ))}
        </Select>
        <Input
          label="Banque"
          name="institution"
          defaultValue={account?.institution ?? ''}
          placeholder="Optionnel"
          error={errors.institution}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Enveloppe"
          name="wrapper"
          defaultValue={account?.wrapper ?? ''}
          hint="PEA, assurance-vie… : ses lignes apparaissent dans Placements."
          error={errors.wrapper}
        >
          <option value="">Aucune</option>
          {ACCOUNT_WRAPPERS.map((wrapper) => (
            <option key={wrapper} value={wrapper}>
              {WRAPPER_LABELS[wrapper]}
            </option>
          ))}
        </Select>
        <Input
          label="Ouvert le"
          name="openedOn"
          type="date"
          defaultValue={account?.openedOn ?? ''}
          hint="Compte les 5 ans d’un PEA, les 8 ans d’une assurance-vie."
          error={errors.openedOn}
        />
      </div>
      <Input
        label="Solde initial"
        name="openingBalance"
        inputMode="decimal"
        defaultValue={account ? centsToInput(account.openingBalanceCents) : ''}
        placeholder="0,00"
        hint="Solde du compte avant la première transaction saisie dans Paper."
        error={errors.openingBalance}
      />
      <Checkbox
        label="Compte par défaut pour les dépenses saisies"
        name="isDefault"
        value="true"
        defaultChecked={account?.isDefault}
      />
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={account?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {account ? 'Enregistrer' : 'Créer le compte'}
        </Button>
        {account ? (
          <Link
            route="accounts.show"
            routeParams={{ id: account.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="accounts.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={account ? `Modifier ${account.name}` : 'Nouveau compte'}
      breadcrumb={<FicheBreadcrumb type="comptes" />}
    >
      {account ? (
        <Form route="accounts.update" routeParams={{ id: account.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="accounts.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

AccountForm.layout = [AppShell]
