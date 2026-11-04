import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Textarea from '~/components/ui/textarea'
import { centsToInput } from '~/lib/format'
import type { EnvelopeDetail } from '#shared/types/budget'
import type { InertiaProps } from '~/types'

export default function EnvelopeForm({
  envelope,
}: InertiaProps<{ envelope: EnvelopeDetail | null }>) {
  const extraKeywords = envelope ? envelope.keywords.join(', ') : ''

  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Nom"
        name="name"
        defaultValue={envelope?.name}
        placeholder="Resto"
        error={errors.name}
        autoFocus
      />
      <Input
        label="Budget mensuel"
        name="monthlyBudget"
        inputMode="decimal"
        defaultValue={envelope ? centsToInput(envelope.monthlyBudgetCents) : ''}
        placeholder="150,00"
        hint="Laissez vide pour suivre les dépenses sans plafond."
        error={errors.monthlyBudget}
      />
      <Input
        label="Mots-clés de saisie"
        name="keywords"
        defaultValue={extraKeywords}
        placeholder="restaurant, mcdo, kebab"
        hint="Séparés par des virgules. Une dépense qui contient l’un de ces mots (ou le nom de l’enveloppe) y est rangée."
        error={errors.keywords}
      />
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={envelope?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {envelope ? 'Enregistrer' : 'Créer l’enveloppe'}
        </Button>
        {envelope ? (
          <Link
            route="envelopes.show"
            routeParams={{ id: envelope.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="envelopes.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={envelope ? `Modifier ${envelope.name}` : 'Nouvelle enveloppe'}
      breadcrumb={<FicheBreadcrumb type="enveloppes" />}
    >
      {envelope ? (
        <Form route="envelopes.update" routeParams={{ id: envelope.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="envelopes.store">
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

EnvelopeForm.layout = [AppShell]
