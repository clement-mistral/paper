import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { maintenanceDue, maintenanceInterval } from '~/components/domain/maintenance_due'
import Button, { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import StatusTag from '~/components/ui/status_tag'
import Textarea from '~/components/ui/textarea'
import { formatKm, todayIso } from '~/lib/format'
import type { MaintenanceDetail } from '#shared/types/auto'
import type { BudgetOptions } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

/**
 * « Marquer fait » : the day, the mileage and the cost of a planned
 * maintenance.
 */
export default function MaintenanceComplete({
  maintenance,
  options,
}: InertiaProps<{ maintenance: MaintenanceDetail; options: BudgetOptions }>) {
  const interval = maintenanceInterval(maintenance)

  return (
    <Page
      title={maintenance.title}
      breadcrumb={<FicheBreadcrumb type="vehicules" />}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          {maintenance.vehicleName} · échéance {maintenanceDue(maintenance)}
          <StatusTag status={maintenance.status} />
        </span>
      }
      actions={
        <Link
          route="maintenances.edit"
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
        <Form route="maintenances.complete" routeParams={{ id: maintenance.id }}>
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
                  label="Kilométrage"
                  name="odometerKm"
                  type="number"
                  min={0}
                  placeholder={String(maintenance.vehicleOdometerKm)}
                  hint={`Compteur actuel : ${formatKm(maintenance.vehicleOdometerKm)}`}
                  error={errors.odometerKm}
                />
                <Input
                  label="Coût"
                  name="cost"
                  inputMode="decimal"
                  placeholder="0,00"
                  hint="Enregistré comme dépense dans Argent."
                  error={errors.cost}
                />
                <Input label="Garage" name="garage" placeholder="Optionnel" error={errors.garage} />
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
              {interval && (
                <p className="text-label text-muted">
                  Revient {interval} : le suivant sera prévu automatiquement.
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={processing}>
                  Marquer fait
                </Button>
                <Link
                  route="vehicles.show"
                  routeParams={{ id: maintenance.vehicleId }}
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

MaintenanceComplete.layout = [AppShell]
