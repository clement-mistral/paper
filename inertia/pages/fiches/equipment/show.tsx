import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import WarrantyTag from '~/components/domain/warranty_tag'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { formatAmount, formatDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { equipmentCategoryLabels } from '~/lib/labels'
import type { EquipmentDetail, EquipmentMaintenanceRow } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

function MaintenanceTitle({ row, extra }: { row: EquipmentMaintenanceRow; extra?: string | null }) {
  return (
    <span className="flex flex-col">
      <Link
        route="equipment_maintenances.edit"
        routeParams={{ id: row.id }}
        className="text-ink hover:underline"
      >
        {row.label}
      </Link>
      {extra && <span className="text-label text-muted">{extra}</span>}
    </span>
  )
}

export default function EquipmentShow({ equipment }: InertiaProps<{ equipment: EquipmentDetail }>) {
  const { maintenances } = equipment

  return (
    <Page
      title={equipment.name}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={
        <Link
          route="homes.show"
          routeParams={{ id: equipment.homeId }}
          className="hover:text-ink hover:underline"
        >
          {equipment.homeName}
        </Link>
      }
      actions={
        <Link
          route="equipment.edit"
          routeParams={{ id: equipment.id }}
          className={buttonClasses('secondary')}
        >
          <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Modifier
        </Link>
      }
    >
      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="maison" /> },
          { label: 'Catégorie', value: equipmentCategoryLabels[equipment.category] },
          ...(equipment.brand || equipment.model
            ? [
                {
                  label: 'Marque et modèle',
                  value: [equipment.brand, equipment.model].filter(Boolean).join(' · '),
                },
              ]
            : []),
          ...(equipment.room ? [{ label: 'Pièce', value: equipment.room }] : []),
          ...(equipment.purchasedOn
            ? [{ label: 'Acheté le', value: formatDate(equipment.purchasedOn) }]
            : []),
          ...(equipment.priceCents
            ? [{ label: 'Prix d’achat', value: formatAmount(equipment.priceCents) }]
            : []),
          { label: 'Garantie', value: <WarrantyTag equipment={equipment} withDate /> },
          ...(maintenances.costCents > 0
            ? [{ label: 'Entretien dépensé', value: formatAmount(maintenances.costCents) }]
            : []),
          ...(equipment.notes ? [{ label: 'Notes', value: equipment.notes }] : []),
        ]}
      />

      <Section
        title="Entretiens à venir"
        action={{
          label: 'Prévoir un entretien',
          href: `${urlFor('equipment_maintenances.create', { id: equipment.id })}?prevu=1`,
        }}
      >
        <DataTable
          caption="Entretiens à venir"
          rows={maintenances.planned}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'label',
              header: 'Entretien',
              cell: (row) => (
                <MaintenanceTitle
                  row={row}
                  extra={row.intervalMonths ? `tous les ${row.intervalMonths} mois` : null}
                />
              ),
            },
            {
              key: 'due',
              header: 'Échéance',
              cell: (row) => (
                <span className="text-muted">{row.dueOn ? formatDate(row.dueOn) : '—'}</span>
              ),
            },
            { key: 'status', header: 'Statut', cell: (row) => <StatusTag status={row.status} /> },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              cell: (row) => (
                <Link
                  route="equipment_maintenances.completion"
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
              Ex. : entretien annuel de la chaudière, ramonage, nettoyage de la VMC.
            </EmptyState>
          }
        />
      </Section>

      <Section
        title="Historique d’entretien"
        action={{
          label: 'Noter un entretien',
          href: urlFor('equipment_maintenances.create', { id: equipment.id }),
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
              key: 'label',
              header: 'Entretien',
              cell: (row) => <MaintenanceTitle row={row} extra={row.provider} />,
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
    </Page>
  )
}

EquipmentShow.layout = [AppShell]
