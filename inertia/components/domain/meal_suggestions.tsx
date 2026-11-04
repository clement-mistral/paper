import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import Button from '~/components/ui/button'
import ProgressBar from '~/components/ui/progress_bar'
import { formatDuration, todayIso } from '~/lib/format'
import type { MealSuggestion } from '#shared/types/menu'

/**
 * Suggested recipes with their « pourquoi » and a one-click « Ce soir ».
 */
export default function MealSuggestions({
  suggestions,
  compact = false,
}: {
  suggestions: MealSuggestion[]
  compact?: boolean
}) {
  return (
    <ul className="flex flex-col">
      {suggestions.map((suggestion) => (
        <li
          key={suggestion.recipe.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-2.5"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <Link
                route="recipes.show"
                routeParams={{ id: suggestion.recipe.id }}
                className="text-sm font-medium text-ink hover:underline"
              >
                {suggestion.recipe.name}
              </Link>
              {suggestion.recipe.totalMinutes !== null && (
                <span className="text-label text-muted">
                  {formatDuration(suggestion.recipe.totalMinutes)}
                </span>
              )}
            </span>
            <span className="text-label text-muted">
              {(compact ? suggestion.reasons.slice(0, 2) : suggestion.reasons).join(' · ')}
            </span>
            {!compact && (
              <ProgressBar
                value={suggestion.coverage}
                tone="menu"
                label={`Ingrédients disponibles pour ${suggestion.recipe.name}`}
                className="max-w-48"
              />
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              router.post(
                urlFor('recipes.plan', { id: suggestion.recipe.id }),
                { plannedOn: todayIso(), slot: 'dinner', servings: suggestion.recipe.servings },
                { preserveScroll: true }
              )
            }
          >
            Ce soir
          </Button>
        </li>
      ))}
    </ul>
  )
}
