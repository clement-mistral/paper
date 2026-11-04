import { useId, useState } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Plus, X } from 'lucide-react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import Textarea from '~/components/ui/textarea'
import { formatDecimal } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { unitLabels } from '~/lib/labels'
import { UNITS, type ImportedRecipeDraft, type RecipeDetail, type Unit } from '#shared/types/menu'
import type { InertiaProps } from '~/types'

type Row = {
  key: number
  name: string
  quantity: string
  unit: Unit
  isMain: boolean
  /** Imported: the published line, and whether the name is a new ingredient. */
  source?: { line: string; known: boolean }
}

let nextKey = 0

function emptyRow(): Row {
  return { key: nextKey++, name: '', quantity: '', unit: 'piece', isMain: false }
}

const cell =
  'h-9 min-w-0 rounded-control border border-border bg-bg px-2 text-sm text-ink focus:border-ink focus:outline-none'

/**
 * Ingredient rows. An unknown name creates the ingredient on save.
 */
function IngredientRows({
  initial,
  names,
  errors,
}: {
  initial: Row[]
  names: string[]
  errors: Record<string, string | undefined>
}) {
  const [rows, setRows] = useState<Row[]>(initial.length > 0 ? initial : [emptyRow()])
  const listId = useId()

  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  return (
    <div className="flex flex-col gap-2">
      <datalist id={listId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div className="hidden grid-cols-[minmax(0,1fr)_5rem_7rem_5.5rem_2rem] gap-2 text-label text-muted sm:grid">
        <span>Ingrédient</span>
        <span>Quantité</span>
        <span>Unité</span>
        <span>Principal</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="grid grid-cols-[minmax(0,1fr)_2rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5.5rem_2rem]"
        >
          <input
            aria-label={`Ingrédient ${index + 1}`}
            name={`ingredients[${index}][name]`}
            list={listId}
            value={row.name}
            onChange={(event) => update(row.key, { name: event.target.value })}
            placeholder="Lardons"
            className={cell}
          />
          <button
            type="button"
            aria-label={`Retirer l’ingrédient ${index + 1}`}
            onClick={() => setRows((current) => current.filter(({ key }) => key !== row.key))}
            className="grid size-9 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink sm:order-last"
          >
            <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
          <div className="col-span-2 grid grid-cols-[5rem_7rem_auto] gap-2 sm:contents">
            <input
              aria-label={`Quantité ${index + 1}`}
              name={`ingredients[${index}][quantity]`}
              inputMode="decimal"
              value={row.quantity}
              onChange={(event) => update(row.key, { quantity: event.target.value })}
              placeholder="200"
              className={cell}
            />
            <select
              aria-label={`Unité ${index + 1}`}
              name={`ingredients[${index}][unit]`}
              value={row.unit}
              onChange={(event) => update(row.key, { unit: event.target.value as Unit })}
              className={cell}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabels[unit]}
                </option>
              ))}
            </select>
            <label className="flex h-9 items-center gap-2 text-label text-muted">
              <input
                type="checkbox"
                name={`ingredients[${index}][isMain]`}
                value="true"
                checked={row.isMain}
                onChange={(event) => update(row.key, { isMain: event.target.checked })}
                className="size-4 accent-ink"
              />
              <span className="sm:sr-only">Principal</span>
            </label>
          </div>
          {row.source && (
            <p className="col-span-full -mt-1 text-label text-muted">
              « {row.source.line} »
              {!row.source.known && (
                <span className="ml-1.5 rounded-tag bg-callout px-1 text-ink">nouveau</span>
              )}
            </p>
          )}
          {(errors[`ingredients.${index}.name`] || errors[`ingredients.${index}.quantity`]) && (
            <p className="col-span-full text-label text-danger">
              {errors[`ingredients.${index}.name`] ?? errors[`ingredients.${index}.quantity`]}
            </p>
          )}
        </div>
      ))}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRows((current) => [...current, emptyRow()])}
        >
          <Plus size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Ajouter un ingrédient
        </Button>
      </div>
    </div>
  )
}

export default function RecipeForm({
  recipe,
  imported,
  ingredientNames,
}: InertiaProps<{
  recipe: RecipeDetail | null
  imported: ImportedRecipeDraft | null
  ingredientNames: string[]
}>) {
  const toInput = (quantity: number | null) =>
    quantity === null ? '' : formatDecimal(quantity).replace(/\s/g, '')
  const initialRows: Row[] = recipe
    ? recipe.ingredients.map((row) => ({
        key: nextKey++,
        name: row.name,
        quantity: toInput(row.quantity),
        unit: row.unit ?? 'piece',
        isMain: row.isMain,
      }))
    : (imported?.ingredients ?? []).map((row) => ({
        key: nextKey++,
        name: row.name,
        quantity: toInput(row.quantity),
        unit: row.unit ?? 'piece',
        isMain: false,
        source: { line: row.line, known: row.known },
      }))
  const draft = recipe ?? imported

  const fields = (errors: Record<string, string | undefined>, processing: boolean) => (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-5">
        <Input
          label="Nom"
          name="name"
          defaultValue={draft?.name}
          placeholder="Pâtes carbonara"
          error={errors.name}
          autoFocus
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Input
            label="Portions"
            name="servings"
            type="number"
            min={1}
            defaultValue={draft?.servings ?? 4}
            error={errors.servings}
          />
          <Input
            label="Préparation (min)"
            name="prepMinutes"
            type="number"
            min={0}
            defaultValue={draft?.prepMinutes ?? ''}
            error={errors.prepMinutes}
          />
          <Input
            label="Cuisson (min)"
            name="cookMinutes"
            type="number"
            min={0}
            defaultValue={draft?.cookMinutes ?? ''}
            error={errors.cookMinutes}
          />
        </div>
        <Input
          label="Mots-clés de saisie"
          name="keywords"
          defaultValue={recipe?.keywords.join(', ') ?? ''}
          placeholder="carbo, pâtes carbo"
          hint="Le nom suffit en général : « carbonara jeudi » trouve « Pâtes carbonara »."
          error={errors.keywords}
        />
      </div>

      <Section title="Ingrédients">
        {imported && (
          <Callout>
            Importée de{' '}
            <a href={imported.sourceUrl} className="underline underline-offset-2" rel="noreferrer">
              {new URL(imported.sourceUrl).hostname}
            </a>
            . Vérifiez le nom de chaque ingrédient : ceux marqués « nouveau » seront ajoutés au
            catalogue, corrigez-les pour les rapprocher d’un ingrédient existant.
          </Callout>
        )}
        <IngredientRows initial={initialRows} names={ingredientNames} errors={errors} />
        <p className="text-label text-muted">
          Un ingrédient inconnu est ajouté au catalogue. Les basiques (sel, huile…) ne vont jamais
          dans les courses : réglez-les dans Fiches › Ingrédients.
        </p>
      </Section>

      <div className="flex flex-col gap-5">
        <Textarea
          label="Étapes"
          name="steps"
          rows={8}
          defaultValue={draft?.steps ?? ''}
          error={errors.steps}
        />
        <Textarea
          label="Notes"
          name="notes"
          defaultValue={recipe?.notes ?? (imported ? `Source : ${imported.sourceUrl}` : '')}
          error={errors.notes}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={processing}>
          {recipe ? 'Enregistrer' : 'Créer la recette'}
        </Button>
        {recipe ? (
          <Link
            route="recipes.show"
            routeParams={{ id: recipe.id }}
            className={buttonClasses('ghost')}
          >
            Annuler
          </Link>
        ) : (
          <Link route="recipes.index" className={buttonClasses('ghost')}>
            Annuler
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <Page
      title={recipe ? `Modifier ${recipe.name}` : 'Nouvelle recette'}
      breadcrumb={<FicheBreadcrumb type="recettes" />}
    >
      {recipe ? (
        <Form route="recipes.update" routeParams={{ id: recipe.id }}>
          {({ errors, processing }) => fields(errors, processing)}
        </Form>
      ) : (
        <Form route="recipes.store">{({ errors, processing }) => fields(errors, processing)}</Form>
      )}
    </Page>
  )
}

RecipeForm.layout = [AppShell]
