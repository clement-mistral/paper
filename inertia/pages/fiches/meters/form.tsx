import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { meterKindLabels } from '~/lib/labels'
import { METER_KINDS, METER_UNITS, type MeterDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function MeterForm({
  home,
  meter,
}: InertiaProps<{ home: { id: number; name: string }; meter: MeterDetail | null }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Énergie"
          name="kind"
          defaultValue={meter?.kind ?? 'electricity'}
          error={errors.kind}
        >
          {METER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {meterKindLabels[kind]} ({METER_UNITS[kind]})
            </option>
          ))}
        </Select>
        <Input
          label="Nom"
          name="label"
          defaultValue={meter?.label}
          placeholder="Linky"
          error={errors.label}
          autoFocus
        />
      </div>
      <Input
        label="Numéro (PDL, PCE…)"
        name="number"
        defaultValue={meter?.number ?? ''}
        placeholder="Optionnel"
        error={errors.number}
      />
      <Textarea label="Notes" name="notes" defaultValue={meter?.notes ?? ''} error={errors.notes} />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {meter ? 'Enregistrer' : 'Ajouter le compteur'}
        </Button>
        {meter ? (
          <Link
            route="meters.show"
            routeParams={{ id: meter.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="homes.show" routeParams={{ id: home.id }} className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={meter ? `Modifier ${meter.label}` : 'Nouveau compteur'}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={home.name}
      actions={
        meter && (
          <DeleteButton
            href={urlFor('meters.destroy', { id: meter.id })}
            label="Le compteur et ses relevés seront supprimés."
          />
        )
      }
    >
      {meter ? (
        <Form route="meters.update" routeParams={{ id: meter.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="meters.store" routeParams={{ id: home.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

MeterForm.layout = [AppShell]
