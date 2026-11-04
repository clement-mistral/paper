import { Form, Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { Pencil, Trash2, X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import ProjectBudget, { projectTone } from '~/components/domain/project_budget'
import Button, { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { formatAmount, formatDate, todayIso } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { projectStatusLabels } from '~/lib/labels'
import type { ProjectDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ProjectShow({ project }: InertiaProps<{ project: ProjectDetail }>) {
  const date = (label: string, value: string | null) =>
    value ? [{ label, value: formatDate(value) }] : []

  return (
    <Page
      title={project.title}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={
        <Link
          route="homes.show"
          routeParams={{ id: project.homeId }}
          className="hover:text-ink hover:underline"
        >
          Travaux du logement
        </Link>
      }
      actions={
        <Link
          route="projects.edit"
          routeParams={{ id: project.id }}
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
            label: 'Statut',
            value: (
              <StatusTag
                status={projectTone[project.status]}
                label={projectStatusLabels[project.status]}
              />
            ),
          },
          ...(project.room ? [{ label: 'Pièce', value: project.room }] : []),
          { label: 'Budget', value: <ProjectBudget project={project} /> },
          ...date('Début', project.startsOn),
          ...date('Objectif', project.targetOn),
          ...date('Terminé le', project.doneOn),
          ...(project.notes
            ? [
                {
                  label: 'Notes',
                  value: <span className="whitespace-pre-line">{project.notes}</span>,
                },
              ]
            : []),
        ]}
      />

      <Section
        title={`Étapes${project.itemCount ? ` · ${project.itemDoneCount}/${project.itemCount}` : ''}`}
      >
        <ul className="flex flex-col">
          {project.items.map((item) => (
            <li key={item.id} className="flex min-h-10 items-center gap-3 border-b border-border">
              <input
                type="checkbox"
                aria-label={`Fait : ${item.label}`}
                checked={item.done}
                onChange={() =>
                  router.patch(
                    urlFor('projects.items.toggle', { itemId: item.id }),
                    {},
                    { preserveScroll: true }
                  )
                }
                className="size-4 shrink-0 cursor-pointer accent-ink"
              />
              <span
                className={item.done ? 'flex-1 text-sm text-muted line-through' : 'flex-1 text-sm'}
              >
                {item.label}
              </span>
              <button
                type="button"
                aria-label={`Retirer « ${item.label} »`}
                title="Retirer"
                onClick={() =>
                  router.delete(urlFor('projects.items.destroy', { itemId: item.id }), {
                    preserveScroll: true,
                  })
                }
                className="grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink"
              >
                <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <Form
          route="projects.items.store"
          routeParams={{ id: project.id }}
          options={{ preserveScroll: true }}
          resetOnSuccess
        >
          {({ errors, processing }) => (
            <div className="flex items-start gap-2">
              <Input
                label="Nouvelle étape"
                hideLabel
                name="label"
                placeholder="Ajouter une étape (acheter la peinture…)"
                error={errors.label}
                className="flex-1"
              />
              <Button type="submit" variant="secondary" disabled={processing}>
                Ajouter
              </Button>
            </div>
          )}
        </Form>
      </Section>

      <Section title="Dépenses">
        <Form
          route="projects.expenses.store"
          routeParams={{ id: project.id }}
          options={{ preserveScroll: true }}
          resetOnSuccess={['label', 'amount']}
        >
          {({ errors, processing }) => (
            <div className="flex flex-wrap items-start gap-3 pt-1">
              <Input
                label="Libellé"
                name="label"
                placeholder="Peinture, outillage…"
                error={errors.label}
                className="min-w-48 flex-1"
              />
              <Input
                label="Montant"
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                error={errors.amount}
                className="w-32"
              />
              <Input
                label="Date"
                name="occurredOn"
                type="date"
                defaultValue={todayIso()}
                error={errors.occurredOn}
                className="w-44"
              />
              <Button type="submit" disabled={processing} className="mt-[22px]">
                Enregistrer
              </Button>
            </div>
          )}
        </Form>
        <p className="text-label text-muted">Chaque dépense est aussi enregistrée dans Argent.</p>
        <DataTable
          caption="Dépenses du projet"
          rows={project.expenses}
          rowKey={(expense) => expense.id}
          columns={[
            {
              key: 'date',
              header: 'Date',
              cell: (expense) => (
                <span className="text-muted">{formatDate(expense.occurredOn)}</span>
              ),
            },
            { key: 'label', header: 'Libellé', cell: (expense) => expense.label },
            {
              key: 'amount',
              header: 'Montant',
              align: 'right',
              cell: (expense) => formatAmount(expense.amountCents),
            },
            {
              key: 'action',
              header: 'Supprimer',
              align: 'right',
              cell: (expense) => (
                <button
                  type="button"
                  aria-label={`Supprimer la dépense « ${expense.label} »`}
                  title="Supprimer"
                  onClick={() =>
                    router.delete(
                      urlFor('projects.expenses.destroy', {
                        id: project.id,
                        transactionId: expense.id,
                      }),
                      { preserveScroll: true }
                    )
                  }
                  className="inline-grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              ),
            },
          ]}
          empty={<EmptyState title="Aucune dépense" />}
        />
      </Section>
    </Page>
  )
}

ProjectShow.layout = [AppShell]
