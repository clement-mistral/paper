import { router } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Checkbox from '~/components/ui/checkbox'
import DeleteButton from '~/components/ui/delete_button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import Select from '~/components/ui/select'
import { ICON_STROKE } from '~/lib/icons'
import { unitLabels } from '~/lib/labels'
import { UNITS, type IngredientDetail } from '#shared/types/menu'
import type { InertiaProps } from '~/types'

export default function IngredientForm({
  ingredient,
}: InertiaProps<{ ingredient: IngredientDetail }>) {
  return (
    <Page
      title={ingredient.name}
      breadcrumb={<FicheBreadcrumb type="ingredients" />}
      actions={
        ingredient.recipeCount === 0 && (
          <DeleteButton
            href={urlFor('ingredients.destroy', { id: ingredient.id })}
            label="Supprimer cet ingrédient du catalogue ?"
          />
        )
      }
    >
      <Form route="ingredients.update" routeParams={{ id: ingredient.id }}>
        {({ errors, processing }) => (
          <div className="flex max-w-xl flex-col gap-5">
            <Input label="Nom" name="name" defaultValue={ingredient.name} error={errors.name} />
            <Select
              label="Unité par défaut"
              name="defaultUnit"
              defaultValue={ingredient.defaultUnit}
              error={errors.defaultUnit}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabels[unit]}
                </option>
              ))}
            </Select>
            <Checkbox
              label="Basique : toujours à la maison, jamais ajouté aux courses"
              name="isStaple"
              value="true"
              defaultChecked={ingredient.isStaple}
            />
            <Input
              label="Synonymes"
              name="aliases"
              defaultValue={ingredient.aliases.join(', ')}
              placeholder="oeufs, œufs frais"
              hint="Autres façons de l’écrire, séparées par des virgules."
              error={errors.aliases}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={processing}>
                Enregistrer
              </Button>
              <Link route="ingredients.index" className={buttonClasses('ghost')}>
                Annuler
              </Link>
            </div>
          </div>
        )}
      </Form>

      <Section title="Peut être remplacé par">
        {ingredient.substitutions.length > 0 && (
          <ul className="flex flex-col">
            {ingredient.substitutions.map((row) => (
              <li
                key={row.id}
                className="flex min-h-10 items-center gap-3 border-b border-border text-sm"
              >
                <span className="flex-1 text-ink">
                  {row.name}
                  {row.note && <span className="text-muted"> · {row.note}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Retirer ${row.name}`}
                  title="Retirer"
                  onClick={() =>
                    router.delete(
                      urlFor('ingredients.substitutions.destroy', { substitutionId: row.id }),
                      { preserveScroll: true }
                    )
                  }
                  className="grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink"
                >
                  <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Form
          route="ingredients.substitutions.store"
          routeParams={{ id: ingredient.id }}
          options={{ preserveScroll: true }}
          resetOnSuccess
        >
          {({ errors, processing }) => (
            <div className="flex flex-wrap items-start gap-3">
              <Input
                label="Ingrédient de remplacement"
                name="name"
                placeholder="Crème liquide"
                error={errors.name}
                className="min-w-44 flex-1"
              />
              <Input
                label="Précision"
                name="note"
                placeholder="Optionnel (même quantité…)"
                error={errors.note}
                className="min-w-44 flex-1"
              />
              <Button type="submit" variant="secondary" disabled={processing} className="mt-[22px]">
                Ajouter
              </Button>
            </div>
          )}
        </Form>
        <p className="text-label text-muted">
          Les suggestions de repas proposent une recette faisable « en remplaçant » quand
          l’ingrédient manque mais qu’un remplacement est en stock.
        </p>
      </Section>
    </Page>
  )
}

IngredientForm.layout = [AppShell]
