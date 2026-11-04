import { useState } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { centsToInput, formatKm, todayIso } from '~/lib/format'
import { maintenanceKindLabels } from '~/lib/labels'
import { cn } from '~/lib/cn'
import { MAINTENANCE_KINDS, type MaintenanceDetail } from '#shared/types/auto'
import type { BudgetOptions } from '#shared/types/maison'
import type { InertiaProps } from '~/types'
import { urlFor } from '~/client'

type Mode = 'done' | 'planned'

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'done', label: 'Déjà fait' },
  { value: 'planned', label: 'À prévoir' },
]

export default function MaintenanceForm({
  vehicle,
  maintenance,
  mode: initialMode,
  options,
}: InertiaProps<{
  vehicle: { id: number; name: string; odometerKm: number }
  maintenance: MaintenanceDetail | null
  mode: Mode
  options: BudgetOptions
}>) {
  const [mode, setMode] = useState<Mode>(initialMode)

  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      {!maintenance && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-label text-muted">Statut</legend>
          <div className="inline-flex w-fit rounded-control border border-border p-0.5">
            {MODES.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  'cursor-pointer rounded-[4px] px-3 py-1.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-ink',
                  mode === value ? 'bg-ink text-bg' : 'text-ink hover:bg-hover'
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Type"
          name="kind"
          defaultValue={maintenance?.kind ?? 'oil_change'}
          error={errors.kind}
        >
          {MAINTENANCE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {maintenanceKindLabels[kind]}
            </option>
          ))}
        </Select>
        <Input
          label="Libellé"
          name="label"
          defaultValue={maintenance?.label ?? ''}
          placeholder="Optionnel (ex. : vidange + filtres)"
          error={errors.label}
        />
      </div>

      {mode === 'done' ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Fait le"
              name="doneOn"
              type="date"
              defaultValue={maintenance?.doneOn ?? todayIso()}
              error={errors.doneOn}
            />
            <Input
              label="Kilométrage"
              name="odometerKm"
              type="number"
              min={0}
              defaultValue={maintenance?.odometerKm ?? ''}
              placeholder={String(vehicle.odometerKm)}
              hint={`Compteur actuel : ${formatKm(vehicle.odometerKm)}`}
              error={errors.odometerKm}
            />
            <Input
              label="Coût"
              name="cost"
              inputMode="decimal"
              defaultValue={maintenance?.costCents ? centsToInput(maintenance.costCents) : ''}
              placeholder="0,00"
              hint="Enregistré comme dépense dans Argent."
              error={errors.cost}
            />
            <Input
              label="Garage"
              name="garage"
              defaultValue={maintenance?.garage ?? ''}
              placeholder="Optionnel"
              error={errors.garage}
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Échéance"
            name="dueOn"
            type="date"
            defaultValue={maintenance?.dueOn ?? ''}
            error={errors.dueOn}
          />
          <Input
            label="Ou à (km)"
            name="dueOdometerKm"
            type="number"
            min={0}
            defaultValue={maintenance?.dueOdometerKm ?? ''}
            hint={`Compteur actuel : ${formatKm(vehicle.odometerKm)}`}
            error={errors.dueOdometerKm}
          />
        </div>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-label text-muted">Revient tous les</legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Kilomètres"
            name="intervalKm"
            type="number"
            min={1}
            defaultValue={maintenance?.intervalKm ?? ''}
            placeholder="15000"
            error={errors.intervalKm}
          />
          <Input
            label="Mois"
            name="intervalMonths"
            type="number"
            min={1}
            defaultValue={maintenance?.intervalMonths ?? ''}
            placeholder="12"
            error={errors.intervalMonths}
          />
        </div>
        <p className="text-label text-muted">
          Optionnel. Une fois l’entretien fait, le suivant est prévu automatiquement (au premier des
          deux atteint).
        </p>
      </fieldset>

      <BudgetSelects
        options={options}
        envelopeId={maintenance?.envelopeId}
        accountId={maintenance?.accountId}
        errors={errors}
      />
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={maintenance?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {maintenance ? 'Enregistrer' : mode === 'done' ? 'Noter l’entretien' : 'Prévoir'}
        </Button>
        <Link
          route="vehicles.show"
          routeParams={{ id: vehicle.id }}
          className={buttonClasses('ghost')}
        >
          Annuler
        </Link>
      </div>
    </div>
  )

  return (
    <Page
      title={
        maintenance
          ? `Modifier ${maintenance.title.toLowerCase()}`
          : mode === 'done'
            ? 'Noter un entretien'
            : 'Prévoir un entretien'
      }
      breadcrumb={<FicheBreadcrumb type="vehicules" />}
      description={vehicle.name}
      actions={
        maintenance && (
          <DeleteButton
            href={urlFor('maintenances.destroy', { id: maintenance.id })}
            label={
              maintenance.doneOn
                ? 'L’entretien sera supprimé, la dépense conservée.'
                : 'L’entretien prévu sera supprimé.'
            }
          />
        )
      }
    >
      {maintenance ? (
        <Form route="maintenances.update" routeParams={{ id: maintenance.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="maintenances.store" routeParams={{ id: vehicle.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

MaintenanceForm.layout = [AppShell]
