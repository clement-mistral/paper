import { Form, Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { Pencil, Plus } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import WarrantyTag from '~/components/domain/warranty_tag'
import ClaimTable from '~/components/domain/claim_table'
import ProjectBudget, { projectTone } from '~/components/domain/project_budget'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Select from '~/components/ui/select'
import DataTable from '~/components/ui/data_table'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { formatDate, formatDecimal } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import {
  equipmentCategoryLabels,
  homeKindLabels,
  meterKindLabels,
  occupancyLabels,
  projectStatusLabels,
  recurrenceLabel,
} from '~/lib/labels'
import type { ChoreRow, ChoreSuggestion, HomeDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

const muted = <span className="text-muted">—</span>

const RHYTHMS = [
  { value: 'weekly:1', label: 'Toutes les semaines' },
  { value: 'weekly:2', label: 'Toutes les 2 semaines' },
  { value: 'monthly:1', label: 'Tous les mois' },
  { value: 'monthly:3', label: 'Tous les 3 mois' },
  { value: 'monthly:6', label: 'Tous les 6 mois' },
  { value: 'daily:1', label: 'Tous les jours' },
  { value: 'yearly:1', label: 'Tous les ans' },
] as const

function ChoreSection({
  chores,
  suggestions,
}: {
  chores: ChoreRow[]
  suggestions: ChoreSuggestion[]
}) {
  return (
    <Section title="Ménage">
      <DataTable
        caption="Ménage"
        rows={chores}
        rowKey={(chore) => chore.id}
        columns={[
          {
            key: 'done',
            header: 'Fait',
            cell: (chore) => (
              <input
                type="checkbox"
                aria-label={`Fait : ${chore.title}`}
                checked={false}
                onChange={() =>
                  router.patch(
                    urlFor('tasks.toggle', { id: chore.id }),
                    {},
                    { preserveScroll: true }
                  )
                }
                className="size-4 cursor-pointer accent-ink"
              />
            ),
          },
          {
            key: 'title',
            header: 'Tâche',
            cell: (chore) => (
              <span className="flex flex-col">
                <Link
                  route="tasks.show"
                  routeParams={{ id: chore.id }}
                  className="text-ink hover:underline"
                >
                  {chore.title}
                </Link>
                {chore.room && <span className="text-label text-muted">{chore.room}</span>}
              </span>
            ),
          },
          {
            key: 'rhythm',
            header: 'Rythme',
            cell: (chore) =>
              chore.recurrence ? (
                <span className="text-muted">
                  {recurrenceLabel(chore.recurrence, chore.recurrenceInterval)}
                </span>
              ) : (
                muted
              ),
          },
          {
            key: 'next',
            header: 'Prochaine fois',
            cell: (chore) =>
              chore.overdue ? (
                <StatusTag status="overdue" label={`En retard · ${formatDate(chore.dueOn!)}`} />
              ) : chore.dueOn ? (
                formatDate(chore.dueOn)
              ) : (
                muted
              ),
          },
          {
            key: 'last',
            header: 'Dernière fois',
            align: 'right',
            cell: (chore) =>
              chore.lastDoneOn ? (
                <span className="text-muted">{formatDate(chore.lastDoneOn)}</span>
              ) : (
                muted
              ),
          },
        ]}
        empty={
          <EmptyState title="Aucune tâche ménagère">
            Choisissez des suggestions ci-dessous ou ajoutez les vôtres.
          </EmptyState>
        }
      />

      <Form
        route="chores.store"
        options={{ preserveScroll: true }}
        resetOnSuccess={['title', 'room']}
      >
        {({ errors, processing }) => <ChoreFields errors={errors} processing={processing} />}
      </Form>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-label text-muted">Suggestions</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.key}>
                <button
                  type="button"
                  onClick={() =>
                    router.post(
                      urlFor('chores.suggest'),
                      { key: suggestion.key },
                      { preserveScroll: true }
                    )
                  }
                  title={recurrenceLabel(suggestion.recurrence, suggestion.recurrenceInterval)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border px-2.5 text-sm text-ink hover:bg-hover"
                >
                  <Plus size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {suggestion.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

/**
 * The rhythm select carries « recurrence:interval »; hidden inputs send
 * the two fields the server expects.
 */
function ChoreFields({
  errors,
  processing,
}: {
  errors: Record<string, string | undefined>
  processing: boolean
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 pt-1">
      <Input
        label="Nouvelle tâche"
        name="title"
        placeholder="Arroser les plantes"
        error={errors.title}
        className="min-w-48 flex-1"
      />
      <Input
        label="Pièce"
        name="room"
        placeholder="Optionnel"
        error={errors.room}
        className="w-40"
      />
      <Select
        label="Rythme"
        name="rhythm"
        defaultValue="weekly:1"
        onChange={(event) => {
          const [recurrence, interval] = event.currentTarget.value.split(':')
          const form = event.currentTarget.form
          if (!form) return
          ;(form.elements.namedItem('recurrence') as HTMLInputElement).value = recurrence
          ;(form.elements.namedItem('recurrenceInterval') as HTMLInputElement).value = interval
        }}
        error={errors.recurrence ?? errors.recurrenceInterval}
        className="w-52"
      >
        {RHYTHMS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <input type="hidden" name="recurrence" defaultValue="weekly" />
      <input type="hidden" name="recurrenceInterval" defaultValue="1" />
      <Button type="submit" variant="secondary" disabled={processing} className="mt-[22px]">
        Ajouter
      </Button>
    </div>
  )
}

export default function HomeShow({
  home,
  chores,
  choreSuggestions,
}: InertiaProps<{ home: HomeDetail; chores: ChoreRow[]; choreSuggestions: ChoreSuggestion[] }>) {
  const totalPower = home.circuits.reduce((total, circuit) => total + (circuit.powerWatts ?? 0), 0)

  return (
    <Page
      title={home.name}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      actions={
        <Link
          route="homes.edit"
          routeParams={{ id: home.id }}
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
          {
            label: 'Type',
            value: `${homeKindLabels[home.kind]} · ${occupancyLabels[home.occupancy]}`,
          },
          ...(home.address
            ? [
                {
                  label: 'Adresse',
                  value: <span className="whitespace-pre-line">{home.address}</span>,
                },
              ]
            : []),
          ...(home.surfaceM2 !== null
            ? [{ label: 'Surface', value: `${formatDecimal(home.surfaceM2)} m²` }]
            : []),
          ...(home.builtYear !== null ? [{ label: 'Construction', value: home.builtYear }] : []),
          ...(home.notes ? [{ label: 'Notes', value: home.notes }] : []),
        ]}
      />

      <ChoreSection chores={chores} suggestions={choreSuggestions} />

      <Section
        title="Travaux"
        action={{ label: 'Nouveau projet', href: urlFor('projects.create') }}
      >
        <DataTable
          caption="Travaux"
          rows={home.projects}
          rowKey={(project) => project.id}
          columns={[
            {
              key: 'title',
              header: 'Projet',
              cell: (project) => (
                <span className="flex flex-col">
                  <Link
                    route="projects.show"
                    routeParams={{ id: project.id }}
                    className="font-medium text-ink hover:underline"
                  >
                    {project.title}
                  </Link>
                  <span className="text-label text-muted">
                    {[
                      project.room,
                      project.itemCount
                        ? `${project.itemDoneCount}/${project.itemCount} étapes`
                        : null,
                      project.targetOn ? `objectif ${formatDate(project.targetOn)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Statut',
              cell: (project) => (
                <StatusTag
                  status={projectTone[project.status]}
                  label={projectStatusLabels[project.status]}
                />
              ),
            },
            {
              key: 'budget',
              header: 'Budget',
              align: 'right',
              cell: (project) => <ProjectBudget project={project} />,
            },
          ]}
          empty={
            <EmptyState title="Aucun projet">
              Repeindre une pièce, isoler les combles… avec budget, étapes et dépenses.
            </EmptyState>
          }
        />
      </Section>

      <Section
        title="Sinistres"
        action={{ label: 'Déclarer un sinistre', href: urlFor('claims.create') }}
      >
        <ClaimTable claims={home.claims} />
      </Section>

      <Section
        title="Équipements"
        action={{
          label: 'Ajouter un équipement',
          href: urlFor('equipment.create', { id: home.id }),
        }}
      >
        <DataTable
          caption="Équipements"
          rows={home.equipment}
          rowKey={(item) => item.id}
          columns={[
            {
              key: 'name',
              header: 'Équipement',
              cell: (item) => (
                <span className="flex flex-col">
                  <Link
                    route="equipment.show"
                    routeParams={{ id: item.id }}
                    className="font-medium text-ink hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span className="text-label text-muted">
                    {[equipmentCategoryLabels[item.category], item.brand]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              ),
            },
            { key: 'room', header: 'Pièce', cell: (item) => item.room ?? muted },
            {
              key: 'warranty',
              header: 'Garantie',
              cell: (item) => <WarrantyTag equipment={item} />,
            },
            {
              key: 'next',
              header: 'Prochain entretien',
              cell: (item) =>
                item.nextMaintenance ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="text-muted">
                      {item.nextMaintenance.dueOn ? formatDate(item.nextMaintenance.dueOn) : '—'}
                    </span>
                    {item.nextMaintenance.status !== 'planned' && (
                      <StatusTag status={item.nextMaintenance.status} />
                    )}
                  </span>
                ) : (
                  muted
                ),
            },
          ]}
          empty={
            <EmptyState title="Aucun équipement">
              Chaudière, chauffe-eau, VMC, lave-linge… avec leur garantie et leurs entretiens.
            </EmptyState>
          }
        />
      </Section>

      <Section
        title="Tableau électrique"
        action={{ label: 'Ajouter un circuit', href: urlFor('circuits.create', { id: home.id }) }}
      >
        <DataTable
          caption="Tableau électrique"
          rows={home.circuits}
          rowKey={(circuit) => circuit.id}
          columns={[
            {
              key: 'reference',
              header: 'Repère',
              cell: (circuit) => (
                <Link
                  route="circuits.edit"
                  routeParams={{ id: circuit.id }}
                  className="font-medium text-ink hover:underline"
                >
                  {circuit.reference}
                </Link>
              ),
            },
            {
              key: 'label',
              header: 'Circuit',
              cell: (circuit) => (
                <span className="flex flex-col">
                  <span>{circuit.label}</span>
                  {circuit.rooms && <span className="text-label text-muted">{circuit.rooms}</span>}
                </span>
              ),
            },
            {
              key: 'breaker',
              header: 'Protection',
              align: 'right',
              cell: (circuit) => (circuit.breakerAmps ? `${circuit.breakerAmps} A` : muted),
            },
            {
              key: 'section',
              header: 'Section',
              align: 'right',
              cell: (circuit) =>
                circuit.sectionMm2 !== null ? `${formatDecimal(circuit.sectionMm2)} mm²` : muted,
            },
            {
              key: 'differential',
              header: 'Différentiel',
              cell: (circuit) => circuit.differential ?? muted,
            },
            {
              key: 'power',
              header: 'Puissance',
              align: 'right',
              cell: (circuit) => (circuit.powerWatts !== null ? `${circuit.powerWatts} W` : muted),
            },
          ]}
          empty={
            <EmptyState title="Aucun circuit">
              Notez chaque disjoncteur : repère, pièces desservies, calibre et section.
            </EmptyState>
          }
        />
        {totalPower > 0 && (
          <p className="text-label text-muted">
            Puissance estimée totale : {formatDecimal(totalPower / 1000)} kW
          </p>
        )}
      </Section>

      <Section
        title="Compteurs"
        action={{ label: 'Ajouter un compteur', href: urlFor('meters.create', { id: home.id }) }}
      >
        <DataTable
          caption="Compteurs"
          rows={home.meters}
          rowKey={(meter) => meter.id}
          columns={[
            {
              key: 'label',
              header: 'Compteur',
              cell: (meter) => (
                <span className="flex flex-col">
                  <Link
                    route="meters.show"
                    routeParams={{ id: meter.id }}
                    className="font-medium text-ink hover:underline"
                  >
                    {meter.label}
                  </Link>
                  <span className="text-label text-muted">{meterKindLabels[meter.kind]}</span>
                </span>
              ),
            },
            {
              key: 'last',
              header: 'Dernier relevé',
              cell: (meter) =>
                meter.lastReading ? (
                  <span>
                    {formatDecimal(meter.lastReading.value)} {meter.unit}
                    <span className="text-muted"> · {formatDate(meter.lastReading.readOn)}</span>
                  </span>
                ) : (
                  muted
                ),
            },
            {
              key: 'perDay',
              header: 'Moyenne',
              align: 'right',
              cell: (meter) =>
                meter.lastReading && meter.lastReading.perDay !== null
                  ? `${formatDecimal(meter.lastReading.perDay)} ${meter.unit}/j`
                  : muted,
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              cell: (meter) => (
                <Link
                  route="meters.show"
                  routeParams={{ id: meter.id }}
                  className={buttonClasses('secondary', 'sm')}
                >
                  Relever
                </Link>
              ),
            },
          ]}
          empty={
            <EmptyState title="Aucun compteur">
              Électricité, eau, gaz : relevez les index pour suivre la consommation.
            </EmptyState>
          }
        />
      </Section>
    </Page>
  )
}

HomeShow.layout = [AppShell]
