import { Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import { ficheMeta } from '~/lib/fiches'
import { unitLabels } from '~/lib/labels'
import type { IngredientSummary } from '#shared/types/menu'
import type { InertiaProps } from '~/types'

export default function IngredientsIndex({
  ingredients,
}: InertiaProps<{ ingredients: IngredientSummary[] }>) {
  const meta = ficheMeta.ingredients
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="ingredients" />}
      description={meta.description}
    >
      <DataTable
        caption="Ingrédients"
        rows={ingredients}
        rowKey={(ingredient) => ingredient.id}
        columns={[
          {
            key: 'name',
            header: 'Nom',
            cell: (ingredient) => (
              <Link
                route="ingredients.edit"
                routeParams={{ id: ingredient.id }}
                className="font-medium text-ink hover:underline"
              >
                {ingredient.name}
              </Link>
            ),
          },
          {
            key: 'unit',
            header: 'Unité',
            cell: (ingredient) => unitLabels[ingredient.defaultUnit],
          },
          {
            key: 'staple',
            header: 'Basique',
            cell: (ingredient) =>
              ingredient.isStaple ? 'Oui' : <span className="text-muted">Non</span>,
          },
          {
            key: 'recipes',
            header: 'Recettes',
            align: 'right',
            cell: (ingredient) => ingredient.recipeCount,
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Catalogue vide"
          >
            Les ingrédients sont créés au fil des recettes.
          </EmptyState>
        }
      />
    </Page>
  )
}

IngredientsIndex.layout = [AppShell]
