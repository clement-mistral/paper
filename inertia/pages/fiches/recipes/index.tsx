import { Link } from '@adonisjs/inertia/react'
import { Download, Plus } from 'lucide-react'
import MealSuggestions from '~/components/domain/meal_suggestions'
import Section from '~/components/ui/section'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import DomainIcon from '~/components/domain/domain_icon'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import { buttonClasses } from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import StatusTag from '~/components/ui/status_tag'
import { ficheMeta } from '~/lib/fiches'
import { formatDuration } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { MealSuggestion, RecipeSummary } from '#shared/types/menu'
import type { InertiaProps } from '~/types'

export default function RecipesIndex({
  recipes,
  suggestions,
}: InertiaProps<{ recipes: RecipeSummary[]; suggestions: MealSuggestion[] }>) {
  const meta = ficheMeta.recettes
  return (
    <Page
      title={meta.label}
      breadcrumb={<FicheBreadcrumb type="recettes" />}
      description={meta.description}
      actions={
        <>
          <Link route="recipes.import" className={buttonClasses('secondary')}>
            <Download size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Importer
          </Link>
          <Link route="recipes.create" className={buttonClasses()}>
            <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Nouvelle recette
          </Link>
        </>
      }
    >
      <Section title="Que cuisiner ?" action={{ label: 'Voir le stock', href: urlFor('lists') }}>
        {suggestions.length === 0 ? (
          <EmptyState title="Pas d’idée pour l’instant">
            Renseignez le frigo et les placards dans Listes : les recettes faisables avec ce que
            vous avez apparaîtront ici.
          </EmptyState>
        ) : (
          <MealSuggestions suggestions={suggestions} />
        )}
      </Section>

      <DataTable
        caption="Recettes"
        rows={recipes}
        rowKey={(recipe) => recipe.id}
        columns={[
          {
            key: 'name',
            header: 'Nom',
            cell: (recipe) => (
              <span className="flex items-center gap-2">
                <Link
                  route="recipes.show"
                  routeParams={{ id: recipe.id }}
                  className="font-medium text-ink hover:underline"
                >
                  {recipe.name}
                </Link>
                {recipe.isDraft && <StatusTag status="upcoming" label="À compléter" />}
              </span>
            ),
          },
          { key: 'servings', header: 'Portions', cell: (recipe) => recipe.servings },
          {
            key: 'time',
            header: 'Temps',
            cell: (recipe) =>
              recipe.totalMinutes ? (
                formatDuration(recipe.totalMinutes)
              ) : (
                <span className="text-muted">—</span>
              ),
          },
          {
            key: 'ingredients',
            header: 'Ingrédients',
            align: 'right',
            cell: (recipe) => recipe.ingredientCount,
          },
        ]}
        empty={
          <EmptyState
            icon={<DomainIcon icon={meta.icon} domain={meta.domain} size={22} />}
            title="Aucune recette pour l’instant"
          >
            Créez une recette, ou planifiez un repas avec Ctrl K (« raclette samedi soir ») : la
            recette sera créée en brouillon.
          </EmptyState>
        }
      />
    </Page>
  )
}

RecipesIndex.layout = [AppShell]
