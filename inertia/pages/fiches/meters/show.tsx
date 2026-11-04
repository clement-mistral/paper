import { Form, Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { Pencil, Trash2 } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import LineChart from '~/components/charts/line_chart'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import { formatDate, formatDayMonth, formatDecimal, todayIso } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { meterKindLabels } from '~/lib/labels'
import type { MeterDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function MeterShow({ meter }: InertiaProps<{ meter: MeterDetail }>) {
  const unit = meter.unit
  const last = meter.lastReading
  const daily = meter.readings
    .filter((reading) => reading.perDay !== null)
    .map((reading) => ({
      key: String(reading.id),
      date: reading.readOn,
      value: reading.perDay!,
      detail: `${reading.days} j jusqu’au ${formatDate(reading.readOn)}`,
    }))

  return (
    <Page
      title={meter.label}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={
        <Link
          route="homes.show"
          routeParams={{ id: meter.homeId }}
          className="hover:text-ink hover:underline"
        >
          {meter.homeName}
        </Link>
      }
      actions={
        <Link
          route="meters.edit"
          routeParams={{ id: meter.id }}
          className={buttonClasses('secondary')}
        >
          <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Modifier
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Dernier index</dt>
          <dd className="text-xl font-semibold text-ink">
            {last ? `${formatDecimal(last.value)} ${unit}` : '—'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Depuis le relevé précédent</dt>
          <dd className="text-xl font-semibold text-ink">
            {last && last.consumption !== null ? `${formatDecimal(last.consumption)} ${unit}` : '—'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Moyenne par jour</dt>
          <dd className="text-xl font-semibold text-ink">
            {last && last.perDay !== null ? `${formatDecimal(last.perDay)} ${unit}` : '—'}
          </dd>
        </div>
      </dl>

      <PropertyList
        properties={[
          { label: 'Énergie', value: `${meterKindLabels[meter.kind]} (${unit})` },
          ...(meter.number ? [{ label: 'Numéro', value: meter.number }] : []),
          ...(meter.notes ? [{ label: 'Notes', value: meter.notes }] : []),
        ]}
      />

      <Section title="Nouveau relevé">
        <Form
          route="meters.readings.store"
          routeParams={{ id: meter.id }}
          options={{ preserveScroll: true }}
          resetOnSuccess={['value']}
        >
          {({ errors, processing }) => (
            <div className="flex flex-wrap items-start gap-3 pt-1">
              <Input
                label="Date"
                name="readOn"
                type="date"
                defaultValue={todayIso()}
                error={errors.readOn}
                className="w-44"
              />
              <Input
                label={`Index (${unit})`}
                name="value"
                inputMode="decimal"
                placeholder={last ? formatDecimal(last.value) : '0'}
                error={errors.value}
                className="w-44"
              />
              <Button type="submit" disabled={processing} className="mt-[22px]">
                Enregistrer
              </Button>
            </div>
          )}
        </Form>
      </Section>

      {daily.length >= 2 && (
        <Section title="Consommation">
          <LineChart
            title={`Consommation moyenne par jour, en ${unit}`}
            domain="maison"
            data={daily}
            format={(value) => `${formatDecimal(value)} ${unit}/j`}
            formatAxis={(value) => formatDecimal(value)}
            formatTick={formatDayMonth}
            zeroBased
            table={false}
          />
          <p className="text-label text-muted">
            Moyenne par jour entre deux relevés ; le détail est dans le tableau ci-dessous.
          </p>
        </Section>
      )}

      <Section title="Relevés">
        <DataTable
          caption="Relevés"
          rows={meter.readings}
          rowKey={(reading) => reading.id}
          columns={[
            {
              key: 'date',
              header: 'Date',
              cell: (reading) => <span className="text-muted">{formatDate(reading.readOn)}</span>,
            },
            {
              key: 'value',
              header: 'Index',
              align: 'right',
              cell: (reading) => `${formatDecimal(reading.value)} ${unit}`,
            },
            {
              key: 'consumption',
              header: 'Consommation',
              align: 'right',
              cell: (reading) =>
                reading.consumption !== null
                  ? `${formatDecimal(reading.consumption)} ${unit} en ${reading.days} j`
                  : '—',
            },
            {
              key: 'perDay',
              header: 'Par jour',
              align: 'right',
              cell: (reading) =>
                reading.perDay !== null ? `${formatDecimal(reading.perDay)} ${unit}` : '—',
            },
            {
              key: 'action',
              header: 'Supprimer',
              align: 'right',
              cell: (reading) => (
                <button
                  type="button"
                  aria-label={`Supprimer le relevé du ${formatDate(reading.readOn)}`}
                  title="Supprimer"
                  onClick={() =>
                    router.delete(urlFor('meters.readings.destroy', { id: reading.id }), {
                      preserveScroll: true,
                    })
                  }
                  className="inline-grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              ),
            },
          ]}
          empty={
            <EmptyState title="Aucun relevé">
              Notez l’index affiché sur le compteur ; la consommation se calcule entre deux relevés.
            </EmptyState>
          }
        />
      </Section>
    </Page>
  )
}

MeterShow.layout = [AppShell]
