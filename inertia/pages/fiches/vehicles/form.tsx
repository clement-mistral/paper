import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { centsToInput } from '~/lib/format'
import { fuelLabels } from '~/lib/labels'
import { FUELS, type VehicleDetail } from '#shared/types/auto'
import type { InertiaProps } from '~/types'

export default function VehicleForm({ vehicle }: InertiaProps<{ vehicle: VehicleDetail | null }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Nom"
        name="name"
        defaultValue={vehicle?.name}
        placeholder="Clio"
        error={errors.name}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Immatriculation"
          name="plate"
          defaultValue={vehicle?.plate ?? ''}
          placeholder="AB-123-CD"
          error={errors.plate}
        />
        <Select
          label="Carburant"
          name="fuel"
          defaultValue={vehicle?.fuel ?? 'sp95'}
          error={errors.fuel}
        >
          {FUELS.map((fuel) => (
            <option key={fuel} value={fuel}>
              {fuelLabels[fuel]}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Compteur initial (km)"
          name="initialOdometerKm"
          type="number"
          min={0}
          defaultValue={vehicle?.initialOdometerKm ?? ''}
          error={errors.initialOdometerKm}
        />
        <Input
          label="Valeur estimée"
          name="estimatedValue"
          inputMode="decimal"
          defaultValue={
            vehicle?.estimatedValueCents ? centsToInput(vehicle.estimatedValueCents) : ''
          }
          placeholder="8 000"
          error={errors.estimatedValue}
        />
      </div>
      <Input
        label="Mots-clés de saisie"
        name="keywords"
        defaultValue={vehicle?.keywords.join(', ') ?? ''}
        placeholder="la voiture, la clio"
        hint="Utile avec plusieurs véhicules : « plein clio 38 L 67 € »."
        error={errors.keywords}
      />
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={vehicle?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {vehicle ? 'Enregistrer' : 'Créer le véhicule'}
        </Button>
        {vehicle ? (
          <Link
            route="vehicles.show"
            routeParams={{ id: vehicle.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="vehicles.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={vehicle ? `Modifier ${vehicle.name}` : 'Nouveau véhicule'}
      breadcrumb={<FicheBreadcrumb type="vehicules" />}
    >
      {vehicle ? (
        <Form route="vehicles.update" routeParams={{ id: vehicle.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="vehicles.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

VehicleForm.layout = [AppShell]
