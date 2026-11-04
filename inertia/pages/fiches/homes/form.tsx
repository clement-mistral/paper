import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Select from '~/components/ui/select'
import Textarea from '~/components/ui/textarea'
import { decimalToInput } from '~/lib/format'
import { homeKindLabels, occupancyLabels } from '~/lib/labels'
import { HOME_KINDS, OCCUPANCIES, type HomeDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function HomeForm({ home }: InertiaProps<{ home: HomeDetail | null }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label="Nom"
        name="name"
        defaultValue={home?.name}
        placeholder="Maison"
        error={errors.name}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select label="Type" name="kind" defaultValue={home?.kind ?? 'house'} error={errors.kind}>
          {HOME_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {homeKindLabels[kind]}
            </option>
          ))}
        </Select>
        <Select
          label="Statut"
          name="occupancy"
          defaultValue={home?.occupancy ?? 'owner'}
          error={errors.occupancy}
        >
          {OCCUPANCIES.map((occupancy) => (
            <option key={occupancy} value={occupancy}>
              {occupancyLabels[occupancy]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        label="Adresse"
        name="address"
        rows={2}
        defaultValue={home?.address ?? ''}
        error={errors.address}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Surface (m²)"
          name="surfaceM2"
          inputMode="decimal"
          defaultValue={decimalToInput(home?.surfaceM2)}
          placeholder="Optionnel"
          error={errors.surfaceM2}
        />
        <Input
          label="Année de construction"
          name="builtYear"
          type="number"
          min={1000}
          max={2200}
          defaultValue={home?.builtYear ?? ''}
          placeholder="Optionnel"
          error={errors.builtYear}
        />
      </div>
      <Textarea label="Notes" name="notes" defaultValue={home?.notes ?? ''} error={errors.notes} />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {home ? 'Enregistrer' : 'Créer le logement'}
        </Button>
        {home ? (
          <Link route="homes.show" routeParams={{ id: home.id }} className={buttonClasses('ghost')}>
            Annuler
          </Link>
        ) : (
          <Link route="fiches.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={home ? `Modifier ${home.name}` : 'Votre logement'}
      description={
        home
          ? undefined
          : 'Décrivez votre logement pour y ranger équipements, circuits et compteurs.'
      }
      breadcrumb={<FicheBreadcrumb type="logement" />}
    >
      {home ? (
        <Form route="homes.update" routeParams={{ id: home.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="homes.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

HomeForm.layout = [AppShell]
