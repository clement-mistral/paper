import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import { ficheMeta } from '~/lib/fiches'
import { formatKm } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { fuelLabels } from '~/lib/labels'
import type { VehicleSummary } from '#shared/types/auto'
import type { InertiaProps } from '~/types'

export default function VehiclesIndex({ vehicles }: InertiaProps<{ vehicles: VehicleSummary[] }>) {
  const meta = ficheMeta.vehicules
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="vehicules" />}
      description={meta.description}
      actions={
        <Link route="vehicles.create" className={buttonClasses()}>
          <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Nouveau véhicule
        </Link>
      }
    >
      <DataTable
        caption="Véhicules"
        rows={vehicles}
        rowKey={(vehicle) => vehicle.id}
        columns={[
          {
            key: 'name',
            header: 'Nom',
            cell: (vehicle) => (
              <Link
                route="vehicles.show"
                routeParams={{ id: vehicle.id }}
                className="font-medium text-ink hover:underline"
              >
                {vehicle.name}
              </Link>
            ),
          },
          {
            key: 'plate',
            header: 'Immatriculation',
            cell: (vehicle) => vehicle.plate ?? <span className="text-muted">—</span>,
          },
          { key: 'fuel', header: 'Carburant', cell: (vehicle) => fuelLabels[vehicle.fuel] },
          {
            key: 'odometer',
            header: 'Compteur',
            align: 'right',
            cell: (vehicle) => formatKm(vehicle.odometerKm),
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Aucun véhicule pour l’instant"
          >
            Ajoutez votre voiture pour saisir vos pleins : « plein 38 L 67 € ».
          </EmptyState>
        }
      />
    </Page>
  )
}

VehiclesIndex.layout = [AppShell]
