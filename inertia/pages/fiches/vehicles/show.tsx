import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import LineChart from '~/components/charts/line_chart'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { maintenanceDue, maintenanceInterval } from '~/components/domain/maintenance_due'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import {
  formatAmount,
  formatDate,
  formatDayMonth,
  formatDecimal,
  formatKm,
  formatLiters,
  formatPrice,
} from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { fuelLabels } from '~/lib/labels'
import type { MaintenanceRow, VehicleDetail, VehicleMaintenances } from '#shared/types/auto'
import type { InertiaProps } from '~/types'

function MaintenanceTitle({ row, extra }: { row: MaintenanceRow; extra?: string | null }) {
  return (
    <span className="flex flex-col">
      <Link
        route="maintenances.edit"
        routeParams={{ id: row.id }}
        className="text-ink hover:underline"
      >
        {row.title}
      </Link>
      {extra && <span className="text-label text-muted">{extra}</span>}
    </span>
  )
}

export default function VehicleShow({
  vehicle,
  maintenances,
}: InertiaProps<{ vehicle: VehicleDetail; maintenances: VehicleMaintenances }>) {
  const prices = vehicle.fuelLogs.map((log) => ({
    key: String(log.id),
    date: log.filledOn,
    value: log.pricePerLiterCents / 100,
    detail: `Plein du ${formatDate(log.filledOn)}`,
  }))
  const consumption = vehicle.fuelLogs
    .filter((log) => log.litersPer100Km !== null)
    .map((log) => ({
      key: String(log.id),
      date: log.filledOn,
      value: log.litersPer100Km!,
      detail: `Plein du ${formatDate(log.filledOn)}`,
    }))

  const stats = [
    { label: 'Compteur', value: formatKm(vehicle.odometerKm) },
    { label: 'Carburant dépensé', value: formatAmount(vehicle.fuelCostCents) },
    { label: 'Entretien dépensé', value: formatAmount(maintenances.costCents) },
    {
      label: 'Coût au km',
      value:
        vehicle.costPerKmCents === null ? '—' : `${formatDecimal(vehicle.costPerKmCents / 100)} €`,
    },
    {
      label: 'Consommation',
      value:
        vehicle.litersPer100Km === null ? '—' : `${formatDecimal(vehicle.litersPer100Km)} L/100`,
    },
  ]

  return (
    <Page
      title={vehicle.name}
      breadcrumb={<FicheBreadcrumb type="vehicules" />}
      actions={
        <>
          <Link
            route="vehicles.edit"
            routeParams={{ id: vehicle.id }}
            className={buttonClasses('secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Modifier
          </Link>
          <DeleteButton
            href={urlFor('vehicles.destroy', { id: vehicle.id })}
            label="Les pleins et entretiens seront supprimés, les dépenses conservées."
          />
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-label text-muted">{label}</dt>
            <dd className="text-xl font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="auto" /> },
          { label: 'Immatriculation', value: vehicle.plate ?? '—' },
          { label: 'Carburant', value: fuelLabels[vehicle.fuel] },
          {
            label: 'Valeur estimée',
            value: vehicle.estimatedValueCents ? formatAmount(vehicle.estimatedValueCents) : '—',
          },
          ...(vehicle.keywords.length > 0
            ? [{ label: 'Mots-clés', value: vehicle.keywords.join(', ') }]
            : []),
          ...(vehicle.notes ? [{ label: 'Notes', value: vehicle.notes }] : []),
        ]}
      />

      <Section
        title="Entretiens à venir"
        action={{
          label: 'Prévoir un entretien',
          href: `${urlFor('maintenances.create', { id: vehicle.id })}?prevu=1`,
        }}
      >
        <DataTable
          caption="Entretiens à venir"
          rows={maintenances.planned}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'title',
              header: 'Entretien',
              cell: (row) => <MaintenanceTitle row={row} extra={maintenanceInterval(row)} />,
            },
            {
              key: 'due',
              header: 'Échéance',
              cell: (row) => <span className="text-muted">{maintenanceDue(row)}</span>,
            },
            {
              key: 'status',
              header: 'Statut',
              cell: (row) => <StatusTag status={row.status} />,
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              cell: (row) => (
                <Link
                  route="maintenances.completion"
                  routeParams={{ id: row.id }}
                  className={buttonClasses('secondary', 'sm')}
                >
                  Marquer fait
                </Link>
              ),
            },
          ]}
          empty={
            <EmptyState title="Aucun entretien prévu">
              Prévoyez la prochaine vidange ou le contrôle technique, par date ou kilométrage.
            </EmptyState>
          }
        />
      </Section>

      <Section
        title="Historique d’entretien"
        action={{
          label: 'Noter un entretien',
          href: urlFor('maintenances.create', { id: vehicle.id }),
        }}
      >
        <DataTable
          caption="Historique d’entretien"
          rows={maintenances.history}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'date',
              header: 'Date',
              cell: (row) => (
                <span className="text-muted">{row.doneOn ? formatDate(row.doneOn) : '—'}</span>
              ),
            },
            {
              key: 'title',
              header: 'Entretien',
              cell: (row) => <MaintenanceTitle row={row} extra={row.garage} />,
            },
            {
              key: 'odometer',
              header: 'Compteur',
              align: 'right',
              cell: (row) => (row.odometerKm === null ? '—' : formatKm(row.odometerKm)),
            },
            {
              key: 'cost',
              header: 'Coût',
              align: 'right',
              cell: (row) => (row.costCents ? formatAmount(row.costCents) : '—'),
            },
          ]}
          empty={<EmptyState title="Aucun entretien noté" />}
        />
      </Section>

      {(prices.length >= 2 || consumption.length >= 2) && (
        <Section title="Évolution des pleins">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {prices.length >= 2 && (
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-label text-muted">Prix au litre</h3>
                <LineChart
                  title="Prix au litre à chaque plein"
                  domain="auto"
                  data={prices}
                  format={(value) => `${formatPrice(value)} €/L`}
                  formatAxis={(value) => `${formatPrice(value)} €`}
                  formatTick={formatDayMonth}
                  table={false}
                />
              </div>
            )}
            {consumption.length >= 2 && (
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-label text-muted">Consommation</h3>
                <LineChart
                  title="Consommation à chaque plein, en litres aux 100 km"
                  domain="auto"
                  data={consumption}
                  format={(value) => `${formatDecimal(value)} L/100`}
                  formatAxis={(value) => formatDecimal(value)}
                  formatTick={formatDayMonth}
                  table={false}
                />
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Pleins">
        <DataTable
          caption="Pleins"
          rows={vehicle.fuelLogs}
          rowKey={(log) => log.id}
          columns={[
            {
              key: 'date',
              header: 'Date',
              cell: (log) => <span className="text-muted">{formatDate(log.filledOn)}</span>,
            },
            {
              key: 'liters',
              header: 'Litres',
              align: 'right',
              cell: (log) => formatLiters(log.liters),
            },
            {
              key: 'price',
              header: 'Prix/L',
              align: 'right',
              cell: (log) => `${formatDecimal(log.pricePerLiterCents / 100)} €`,
            },
            {
              key: 'odometer',
              header: 'Compteur',
              align: 'right',
              cell: (log) => (log.odometerKm === null ? '—' : formatKm(log.odometerKm)),
            },
            {
              key: 'consumption',
              header: 'L/100',
              align: 'right',
              cell: (log) =>
                log.litersPer100Km === null ? '—' : formatDecimal(log.litersPer100Km),
            },
            {
              key: 'total',
              header: 'Montant',
              align: 'right',
              cell: (log) => formatAmount(log.totalCents),
            },
          ]}
          empty={
            <EmptyState title="Aucun plein">
              Avec Ctrl K : « plein 38 L 67 € 142 380 km ».
            </EmptyState>
          }
        />
      </Section>
    </Page>
  )
}

VehicleShow.layout = [AppShell]
