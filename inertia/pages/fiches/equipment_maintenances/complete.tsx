import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import StatusTag from '~/components/ui/status_tag'
import Textarea from '~/components/ui/textarea'
import { formatDate, todayIso } from '~/lib/format'
import type { BudgetOptions, EquipmentMaintenanceDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

/**
 * « Marquer fait » : the day, the cost and who did a planned maintenance.
 */
export default function EquipmentMaintenanceComplete({
  maintenance,
  options,
}: InertiaProps<{ maintenance: EquipmentMaintenanceDetail; options: BudgetOptions }>) {
  return (
    <Page
      title={maintenance.label}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          {maintenance.equipmentName}
          {maintenance.dueOn && ` · échéance ${formatDate(maintenance.dueOn)}`}
          <StatusTag status={maintenance.status} />
        </span>
      }
      actions={
        <Link
          route="equipment_maintenances.edit"
          routeParams={{ id: maintenance.id }}
          className={buttonClasses('secondary')}
        >
          Modifier l’échéance
        </Link>
      }
    >
      {maintenance.doneOn ? (
        <Callout>Cet entretien est déjà fait.</Callout>
      ) : (
        <Form route="equipment_maintenances.complete" routeParams={{ id: maintenance.id }}>
          {({ errors, processing }) => (
            <div className="flex max-w-xl flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Fait le"
                  name="doneOn"
                  type="date"
                  defaultValue={todayIso()}
                  error={errors.doneOn}
                  autoFocus
                />
                <Input
                  label="Coût"
                  name="cost"
                  inputMode="decimal"
                  placeholder="0,00"
                  hint="Enregistré comme dépense dans Argent."
                  error={errors.cost}
                />
                <Input
                  label="Intervenant"
                  name="provider"
                  placeholder="Optionnel"
                  error={errors.provider}
                />
              </div>
              <BudgetSelects
                options={options}
                envelopeId={maintenance.envelopeId}
                accountId={maintenance.accountId}
                errors={errors}
              />
              <Textarea
                label="Notes"
                name="notes"
                defaultValue={maintenance.notes ?? ''}
                error={errors.notes}
              />
              {maintenance.intervalMonths && (
                <p className="text-label text-muted">
                  Revient tous les {maintenance.intervalMonths} mois : le suivant sera prévu
                  automatiquement.
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={processing}>
                  Marquer fait
                </Button>
                <Link
                  route="equipment.show"
                  routeParams={{ id: maintenance.equipmentId }}
                  className={buttonClasses('ghost')}
                >
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

EquipmentMaintenanceComplete.layout = [AppShell]
