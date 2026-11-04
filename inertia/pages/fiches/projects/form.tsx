import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import BudgetSelects from '~/components/domain/budget_selects'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { centsToInput } from '~/lib/format'
import { projectStatusLabels } from '~/lib/labels'
import { PROJECT_STATUSES, type BudgetOptions, type ProjectDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function ProjectForm({
  homeId,
  project,
  options,
}: InertiaProps<{ homeId: number; project: ProjectDetail | null; options: BudgetOptions }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Projet"
        name="title"
        defaultValue={project?.title}
        placeholder="Repeindre la chambre"
        error={errors.title}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Statut"
          name="status"
          defaultValue={project?.status ?? 'idea'}
          error={errors.status}
        >
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {projectStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Input
          label="Pièce"
          name="room"
          defaultValue={project?.room ?? ''}
          placeholder="Optionnel"
          error={errors.room}
        />
        <Input
          label="Budget prévu"
          name="budget"
          inputMode="decimal"
          defaultValue={project?.budgetCents ? centsToInput(project.budgetCents) : ''}
          placeholder="Optionnel"
          error={errors.budget}
        />
        <Input
          label="Objectif"
          name="targetOn"
          type="date"
          defaultValue={project?.targetOn ?? ''}
          error={errors.targetOn}
        />
        <Input
          label="Début"
          name="startsOn"
          type="date"
          defaultValue={project?.startsOn ?? ''}
          error={errors.startsOn}
        />
        <Input
          label="Terminé le"
          name="doneOn"
          type="date"
          defaultValue={project?.doneOn ?? ''}
          hint="Avec le statut « Terminé »."
          error={errors.doneOn}
        />
      </div>
      <BudgetSelects
        options={options}
        envelopeId={project?.envelopeId}
        accountId={project?.accountId}
        errors={errors}
      />
      <p className="-mt-3 text-label text-muted">
        Les dépenses du projet sont enregistrées sur cette enveloppe et ce compte.
      </p>
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={project?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {project ? 'Enregistrer' : 'Créer le projet'}
        </Button>
        {project ? (
          <Link
            route="projects.show"
            routeParams={{ id: project.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="homes.show" routeParams={{ id: homeId }} className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={project ? `Modifier ${project.title}` : 'Nouveau projet'}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description="Travaux"
      actions={
        project && (
          <DeleteButton
            href={urlFor('projects.destroy', { id: project.id })}
            label="Le projet sera supprimé, ses dépenses conservées dans Argent."
          />
        )
      }
    >
      {project ? (
        <Form route="projects.update" routeParams={{ id: project.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="projects.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

ProjectForm.layout = [AppShell]
