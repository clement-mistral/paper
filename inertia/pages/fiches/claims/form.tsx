import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { centsToInput, todayIso } from '~/lib/format'
import { claimStatusLabels } from '~/lib/labels'
import { CLAIM_STATUSES, type ClaimDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ClaimForm({
  homeId,
  claim,
  insurances,
}: InertiaProps<{
  homeId: number
  claim: ClaimDetail | null
  insurances: Array<{ id: number; name: string }>
}>) {
  const cents = (value: number | null | undefined) => (value ? centsToInput(value) : '')

  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Sinistre"
        name="title"
        defaultValue={claim?.title}
        placeholder="Dégât des eaux salle de bain"
        error={errors.title}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Survenu le"
          name="occurredOn"
          type="date"
          defaultValue={claim?.occurredOn ?? todayIso()}
          error={errors.occurredOn}
        />
        <Select
          label="Statut"
          name="status"
          defaultValue={claim?.status ?? 'to_declare'}
          error={errors.status}
        >
          {CLAIM_STATUSES.map((status) => (
            <option key={status} value={status}>
              {claimStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Select
          label="Assurance"
          name="contractId"
          defaultValue={claim?.contractId ?? ''}
          hint={insurances.length === 0 ? 'Ajoutez vos assurances dans Contrats.' : undefined}
          error={errors.contractId}
        >
          <option value="">Aucune</option>
          {insurances.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <Input
          label="Numéro de sinistre"
          name="claimNumber"
          defaultValue={claim?.claimNumber ?? ''}
          error={errors.claimNumber}
        />
        <Input
          label="Déclaré le"
          name="declaredOn"
          type="date"
          defaultValue={claim?.declaredOn ?? ''}
          error={errors.declaredOn}
        />
        <Input
          label="Montant des dégâts"
          name="damage"
          inputMode="decimal"
          defaultValue={cents(claim?.damageCents)}
          placeholder="Estimation"
          error={errors.damage}
        />
        <Input
          label="Franchise"
          name="deductible"
          inputMode="decimal"
          defaultValue={cents(claim?.deductibleCents)}
          error={errors.deductible}
        />
        <Input
          label="Indemnisation reçue"
          name="compensation"
          inputMode="decimal"
          defaultValue={cents(claim?.compensationCents)}
          error={errors.compensation}
        />
        <Input
          label="Indemnisé le"
          name="compensatedOn"
          type="date"
          defaultValue={claim?.compensatedOn ?? ''}
          error={errors.compensatedOn}
        />
      </div>
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={claim?.notes ?? ''}
        placeholder="Circonstances, expert, échanges avec l’assureur…"
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {claim ? 'Enregistrer' : 'Enregistrer le sinistre'}
        </Button>
        {claim ? (
          <Link
            route="claims.show"
            routeParams={{ id: claim.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="homes.show" routeParams={{ id: homeId }} className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={claim ? `Modifier ${claim.title}` : 'Nouveau sinistre'}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      actions={
        claim && (
          <DeleteButton
            href={urlFor('claims.destroy', { id: claim.id })}
            label="Le sinistre sera supprimé."
          />
        )
      }
    >
      {claim ? (
        <Form route="claims.update" routeParams={{ id: claim.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="claims.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

ClaimForm.layout = [AppShell]
