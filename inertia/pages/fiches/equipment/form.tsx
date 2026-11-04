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
import { centsToInput } from '~/lib/format'
import { equipmentCategoryLabels } from '~/lib/labels'
import { EQUIPMENT_CATEGORIES, type EquipmentDetail } from '#shared/types/maison'
import type { InertiaProps } from '~/types'

export default function EquipmentForm({
  home,
  equipment,
}: InertiaProps<{ home: { id: number; name: string }; equipment: EquipmentDetail | null }>) {
  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Nom"
          name="name"
          defaultValue={equipment?.name}
          placeholder="Chaudière"
          error={errors.name}
          autoFocus
        />
        <Select
          label="Catégorie"
          name="category"
          defaultValue={equipment?.category ?? 'other'}
          error={errors.category}
        >
          {EQUIPMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {equipmentCategoryLabels[category]}
            </option>
          ))}
        </Select>
        <Input
          label="Marque"
          name="brand"
          defaultValue={equipment?.brand ?? ''}
          placeholder="Optionnel"
          error={errors.brand}
        />
        <Input
          label="Modèle"
          name="model"
          defaultValue={equipment?.model ?? ''}
          placeholder="Optionnel"
          error={errors.model}
        />
        <Input
          label="Pièce"
          name="room"
          defaultValue={equipment?.room ?? ''}
          placeholder="Cellier"
          error={errors.room}
        />
        <Input
          label="Prix d’achat"
          name="price"
          inputMode="decimal"
          defaultValue={equipment?.priceCents ? centsToInput(equipment.priceCents) : ''}
          placeholder="Optionnel"
          error={errors.price}
        />
        <Input
          label="Acheté le"
          name="purchasedOn"
          type="date"
          defaultValue={equipment?.purchasedOn ?? ''}
          error={errors.purchasedOn}
        />
        <Input
          label="Garantie jusqu’au"
          name="warrantyUntil"
          type="date"
          defaultValue={equipment?.warrantyUntil ?? ''}
          error={errors.warrantyUntil}
        />
      </div>
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={equipment?.notes ?? ''}
        error={errors.notes}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={processing}>
          {equipment ? 'Enregistrer' : 'Ajouter l’équipement'}
        </Button>
        {equipment ? (
          <Link
            route="equipment.show"
            routeParams={{ id: equipment.id }}
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
      title={equipment ? `Modifier ${equipment.name}` : 'Nouvel équipement'}
      breadcrumb={<FicheBreadcrumb type="logement" />}
      description={home.name}
      actions={
        equipment && (
          <DeleteButton
            href={urlFor('equipment.destroy', { id: equipment.id })}
            label="L’équipement et ses entretiens seront supprimés, les dépenses conservées."
          />
        )
      }
    >
      {equipment ? (
        <Form route="equipment.update" routeParams={{ id: equipment.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="equipment.store" routeParams={{ id: home.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      )}
    </Page>
  )
}

EquipmentForm.layout = [AppShell]
