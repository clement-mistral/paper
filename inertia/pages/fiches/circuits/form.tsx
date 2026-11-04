import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Textarea from '~/components/ui/textarea'
import { decimalToInput } from '~/lib/format'
import type { CircuitRow } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function CircuitForm({
  home,
  circuit,
  suggestedReference,
}: InertiaProps<{
  home: { id: number; name: string }
  circuit: CircuitRow | null
  suggestedReference: string
}>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid grid-cols-[6rem_1fr] gap-5">
        <Input
          label="Repère"
          name="reference"
          defaultValue={circuit?.reference ?? suggestedReference}
          error={errors.reference}
        />
        <Input
          label="Circuit"
          name="label"
          defaultValue={circuit?.label}
          placeholder="Prises cuisine"
          error={errors.label}
          autoFocus
        />
      </div>
      <Input
        label="Pièces desservies"
        name="rooms"
        defaultValue={circuit?.rooms ?? ''}
        placeholder="Cuisine, cellier"
        error={errors.rooms}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Calibre (A)"
          name="breakerAmps"
          type="number"
          min={1}
          defaultValue={circuit?.breakerAmps ?? ''}
          placeholder="20"
          error={errors.breakerAmps}
        />
        <Input
          label="Section (mm²)"
          name="sectionMm2"
          inputMode="decimal"
          defaultValue={decimalToInput(circuit?.sectionMm2)}
          placeholder="2,5"
          error={errors.sectionMm2}
        />
        <Input
          label="Différentiel"
          name="differential"
          defaultValue={circuit?.differential ?? ''}
          placeholder="ID1 · 30 mA type A"
          error={errors.differential}
        />
        <Input
          label="Puissance estimée (W)"
          name="powerWatts"
          type="number"
          min={0}
          defaultValue={circuit?.powerWatts ?? ''}
          placeholder="Optionnel"
          error={errors.powerWatts}
        />
      </div>
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={circuit?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {circuit ? 'Enregistrer' : 'Ajouter le circuit'}
        </Button>
        <Link route="homes.show" routeParams={{ id: home.id }} className={buttonClasses('ghost')}>
          Annuler
        </Link>
      </div>
    </div>
  )

  return (
    <Page
      title={circuit ? `Modifier le circuit ${circuit.reference}` : 'Nouveau circuit'}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={`${home.name} · tableau électrique`}
      actions={
        circuit && (
          <DeleteButton
            href={urlFor('circuits.destroy', { id: circuit.id })}
            label="Le circuit sera supprimé."
          />
        )
      }
    >
      {circuit ? (
        <Form route="circuits.update" routeParams={{ id: circuit.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="circuits.store" routeParams={{ id: home.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

CircuitForm.layout = [AppShell]
