import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Checkbox from '~/components/ui/checkbox'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { domainMeta } from '~/lib/domains'
import { contractCategoryLabels } from '~/lib/labels'
import { DOMAINS } from '#shared/types/domain'
import { CONTRACT_CATEGORIES, type ContractDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ContractForm({
  contract,
  subscriptions,
}: InertiaProps<{
  contract: ContractDetail | null
  subscriptions: Array<{ id: number; name: string }>
}>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Nom"
        name="name"
        defaultValue={contract?.name}
        placeholder="Assurance habitation"
        error={errors.name}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Catégorie"
          name="category"
          defaultValue={contract?.category ?? 'other'}
          error={errors.category}
        >
          {CONTRACT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {contractCategoryLabels[category]}
            </option>
          ))}
        </Select>
        <Select
          label="Domaine"
          name="domain"
          defaultValue={contract?.domain ?? 'maison'}
          error={errors.domain}
        >
          {DOMAINS.map((domain) => (
            <option key={domain} value={domain}>
              {domainMeta[domain].label}
            </option>
          ))}
        </Select>
        <Input
          label="Fournisseur"
          name="provider"
          defaultValue={contract?.provider ?? ''}
          placeholder="Optionnel"
          error={errors.provider}
        />
        <Input
          label="Contact"
          name="contact"
          defaultValue={contract?.contact ?? ''}
          placeholder="Téléphone, site, e-mail"
          error={errors.contact}
        />
        <Input
          label="Numéro client"
          name="customerNumber"
          defaultValue={contract?.customerNumber ?? ''}
          error={errors.customerNumber}
        />
        <Input
          label="Numéro de contrat"
          name="contractNumber"
          defaultValue={contract?.contractNumber ?? ''}
          error={errors.contractNumber}
        />
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
        <legend className="sr-only">Engagement</legend>
        <p className="text-sm font-semibold text-ink">Engagement et préavis</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Début du contrat"
            name="startedOn"
            type="date"
            defaultValue={contract?.startedOn ?? ''}
            error={errors.startedOn}
          />
          <Input
            label="Fin d’engagement"
            name="commitmentUntil"
            type="date"
            defaultValue={contract?.commitmentUntil ?? ''}
            hint="Ou date anniversaire du contrat."
            error={errors.commitmentUntil}
          />
          <Input
            label="Préavis (jours)"
            name="noticeDays"
            type="number"
            min={0}
            defaultValue={contract?.noticeDays ?? ''}
            placeholder="30"
            error={errors.noticeDays}
          />
          <Input
            label="Reconduit pour (mois)"
            name="renewalMonths"
            type="number"
            min={1}
            defaultValue={contract?.renewalMonths ?? ''}
            placeholder="12"
            error={errors.renewalMonths}
          />
        </div>
        <Checkbox
          label="Reconduction tacite"
          name="tacitRenewal"
          value="true"
          defaultChecked={contract?.tacitRenewal}
        />
        <p className="text-label text-muted">
          Un rappel « Résilier ou renégocier » apparaît dans À faire un mois avant la date limite de
          préavis.
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Abonnement lié"
          name="subscriptionId"
          defaultValue={contract?.subscriptionId ?? ''}
          hint="Pour le prix et les prélèvements."
          error={errors.subscriptionId}
        >
          <option value="">Aucun</option>
          {subscriptions.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <Input
          label="Résilié le"
          name="endedOn"
          type="date"
          defaultValue={contract?.endedOn ?? ''}
          error={errors.endedOn}
        />
      </div>
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={contract?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {contract ? 'Enregistrer' : 'Créer le contrat'}
        </Button>
        {contract ? (
          <Link
            route="contracts.show"
            routeParams={{ id: contract.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="contracts.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={contract ? `Modifier ${contract.name}` : 'Nouveau contrat'}
      breadcrumb={<FicheBreadcrumb type="contrats" />}
    >
      {contract ? (
        <Form route="contracts.update" routeParams={{ id: contract.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="contracts.store">
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

ContractForm.layout = [AppShell]
