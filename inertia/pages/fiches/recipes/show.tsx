import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import DataTable from '~/components/ui/data_table'
import DeleteButton from '~/components/ui/delete_button'
import DomainTag from '~/components/ui/domain_tag'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import PropertyList from '~/components/ui/property_list'
import Section from '~/components/ui/section'
import { formatDecimal, formatDuration, formatShortDay } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { slotLabels, unitLabels } from '~/lib/labels'
import type { RecipeDetail } from '#shared/types/menu'
import type { InertiaProps } from '~/types'

export default function RecipeShow({ recipe }: InertiaProps<{ recipe: RecipeDetail }>) {
  return (
    <Page
      title={recipe.name}
      breadcrumb={<FicheBreadcrumb type="recettes" />}
      actions={
        <>
          <Link
            route="recipes.edit"
            routeParams={{ id: recipe.id }}
            className={buttonClasses(recipe.isDraft ? 'primary' : 'secondary')}
          >
            <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {recipe.isDraft ? 'Compléter' : 'Modifier'}
          </Link>
          <DeleteButton
            href={urlFor('recipes.destroy', { id: recipe.id })}
            label="Les repas planifiés avec cette recette seront supprimés."
          />
        </>
      }
    >
      {recipe.isDraft && (
        <Callout title="Recette créée depuis la saisie rapide">
          Ajoutez ses ingrédients : ils iront automatiquement dans les courses lors des prochains
          repas.
        </Callout>
      )}

      <PropertyList
        properties={[
          { label: 'Domaine', value: <DomainTag domain="menu" /> },
          { label: 'Portions', value: recipe.servings },
          {
            label: 'Préparation',
            value: recipe.prepMinutes ? formatDuration(recipe.prepMinutes) : '—',
          },
          {
            label: 'Cuisson',
            value: recipe.cookMinutes ? formatDuration(recipe.cookMinutes) : '—',
          },
          ...(recipe.keywords.length > 0
            ? [{ label: 'Mots-clés', value: recipe.keywords.join(', ') }]
            : []),
        ]}
      />

      <Section title="Ingrédients">
        {recipe.ingredients.length === 0 ? (
          <EmptyState title="Aucun ingrédient" />
        ) : (
          <ul className="flex flex-col">
            {recipe.ingredients.map((row) => (
              <li
                key={row.ingredientId}
                className="flex min-h-9 items-baseline gap-3 border-b border-border py-1.5"
              >
                <span className={row.isMain ? 'font-medium' : undefined}>{row.name}</span>
                {row.quantity !== null && (
                  <span className="text-label text-muted">
                    {formatDecimal(row.quantity)} {row.unit ? unitLabels[row.unit] : ''}
                  </span>
                )}
                {row.isStaple && <span className="ml-auto text-xs text-muted">basique</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {recipe.steps && (
        <Section title="Étapes">
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink">{recipe.steps}</p>
        </Section>
      )}

      <Section title="Mentionnée dans">
        <DataTable
          caption="Repas planifiés"
          rows={recipe.meals}
          rowKey={(meal) => meal.id}
          columns={[
            { key: 'date', header: 'Date', cell: (meal) => formatShortDay(meal.plannedOn) },
            { key: 'slot', header: 'Repas', cell: (meal) => slotLabels[meal.slot] },
            { key: 'servings', header: 'Personnes', align: 'right', cell: (meal) => meal.servings },
          ]}
          empty={
            <EmptyState title="Jamais planifiée">
              Avec Ctrl K : « {recipe.name} jeudi soir ».
            </EmptyState>
          }
        />
      </Section>

      {recipe.notes && (
        <Section title="Notes">
          <p className="text-sm whitespace-pre-line">{recipe.notes}</p>
        </Section>
      )}
    </Page>
  )
}

RecipeShow.layout = [AppShell]
