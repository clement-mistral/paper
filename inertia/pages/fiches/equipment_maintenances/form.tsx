import { useState } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Textarea from '~/components/ui/textarea'
import { cn } from '~/lib/cn'
import { centsToInput, todayIso } from '~/lib/format'
import type { BudgetOptions, EquipmentMaintenanceDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

type Mode = 'done' | 'planned'

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'done', label: 'Déjà fait' },
  { value: 'planned', label: 'À prévoir' },
]

export default function EquipmentMaintenanceForm({
  equipment,
  maintenance,
  mode: initialMode,
  options,
}: InertiaProps<{
  equipment: { id: number; name: string }
  maintenance: EquipmentMaintenanceDetail | null
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

      <Input
        label="Entretien"
        name="label"
        defaultValue={maintenance?.label ?? ''}
        placeholder="Entretien annuel"
        error={errors.label}
        autoFocus
      />

      {mode === 'done' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Fait le"
            name="doneOn"
            type="date"
            defaultValue={maintenance?.doneOn ?? todayIso()}
            error={errors.doneOn}
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
            label="Intervenant"
            name="provider"
            defaultValue={maintenance?.provider ?? ''}
            placeholder="Optionnel"
            error={errors.provider}
          />
        </div>
      ) : (
        <Input
          label="Échéance"
          name="dueOn"
          type="date"
          defaultValue={maintenance?.dueOn ?? ''}
          error={errors.dueOn}
          className="sm:max-w-[calc(50%-10px)]"
        />
      )}

      <Input
        label="Revient tous les (mois)"
        name="intervalMonths"
        type="number"
        min={1}
        defaultValue={maintenance?.intervalMonths ?? ''}
        placeholder="12"
        hint="Optionnel. Une fois l’entretien fait, le suivant est prévu automatiquement."
        error={errors.intervalMonths}
        className="sm:max-w-[calc(50%-10px)]"
      />

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
          route="equipment.show"
          routeParams={{ id: equipment.id }}
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
          ? `Modifier « ${maintenance.label} »`
          : mode === 'done'
            ? 'Noter un entretien'
            : 'Prévoir un entretien'
      }
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={equipment.name}
      actions={
        maintenance && (
          <DeleteButton
            href={urlFor('equipment_maintenances.destroy', { id: maintenance.id })}
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
        <Form route="equipment_maintenances.update" routeParams={{ id: maintenance.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="equipment_maintenances.store" routeParams={{ id: equipment.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

EquipmentMaintenanceForm.layout = [AppShell]
