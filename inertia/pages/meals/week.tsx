import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronLeft, ChevronRight, ShoppingBasket, Sparkles, X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button, { buttonClasses } from '~/components/ui/button'
import Page from '~/components/ui/page'
import StatusTag from '~/components/ui/status_tag'
import { cn } from '~/lib/cn'
import { formatDayMonth, formatShortDay, todayIso } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { mealOutcomeLabels, slotLabels } from '~/lib/labels'
import { MEAL_SLOTS, type MealPlanRow, type MealSlot, type MealWeek } from '#shared/types/menu'
import type { InertiaProps } from '~/types'

type Day = MealWeek['days'][number]
type RecipeOption = MealWeek['recipes'][number]

const weekUrl = (start: string) => `${urlFor('meals.week')}?semaine=${start}`

function plan(meal: { recipeId: number; plannedOn: string; slot: MealSlot; servings: number }) {
  router.post(urlFor('meals.store'), meal, { preserveScroll: true })
}

/**
 * « Repas de la semaine »: Monday to Sunday, lunch and dinner. Empty
 * dinners from today get a proposal (the meal suggestions, each recipe
 * once); planning a meal puts its ingredients on the shopping list.
 */
export default function Week({ week }: InertiaProps<{ week: MealWeek }>) {
  const proposals = week.days.filter((day) => day.proposal !== null)
  const end = week.days[6].date

  return (
    <Page
      title="Repas de la semaine"
      description={`Du ${formatDayMonth(week.start)} au ${formatDayMonth(end)}`}
      actions={
        <>
          <div className="inline-flex rounded-control border border-border">
            <Link
              href={weekUrl(week.previous)}
              aria-label="Semaine précédente"
              className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"
            >
              <ChevronLeft size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </Link>
            <Link
              href={urlFor('meals.week')}
              aria-current={week.isCurrent ? 'page' : undefined}
              className={cn(
                'grid h-9 place-items-center border-x border-border px-3 text-label',
                week.isCurrent ? 'text-accent-ink' : 'text-ink hover:bg-hover'
              )}
            >
              Cette semaine
            </Link>
            <Link
              href={weekUrl(week.next)}
              aria-label="Semaine suivante"
              className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"
            >
              <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </Link>
          </div>
          <Link route="lists" className={buttonClasses('secondary')}>
            <ShoppingBasket size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Courses{week.shoppingCount > 0 ? ` (${week.shoppingCount})` : ''}
          </Link>
          {proposals.length > 0 && (
            <Button
              onClick={() =>
                router.post(
                  urlFor('meals.store_many'),
                  {
                    meals: proposals.map((day) => ({
                      recipeId: day.proposal!.recipe.id,
                      plannedOn: day.date,
                      slot: 'dinner',
                      servings: day.proposal!.recipe.servings,
                    })),
                  },
                  { preserveScroll: true }
                )
              }
            >
              <Sparkles size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Garder les {proposals.length} propositions
            </Button>
          )}
        </>
      }
    >
      {week.isCurrent && week.days.filter((day) => !day.past).length <= 2 && (
        <Link
          href={weekUrl(week.next)}
          className="group flex items-center gap-3 rounded-card bg-menu-soft px-4 py-3 text-sm text-menu-ink hover:ring-1 hover:ring-menu/30"
        >
          <Sparkles size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0" />
          <span className="flex-1">
            La semaine se termine : préparez la suivante, des idées vous attendent.
          </span>
          <ChevronRight
            size={16}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className="shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}

      {week.recipes.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune recette pour l’instant.{' '}
          <Link route="recipes.create" className="text-accent-ink hover:underline">
            Ajouter une recette
          </Link>
        </p>
      ) : (
        <ol className="flex flex-col">
          {week.days.map((day) => (
            <DayRow key={day.date} day={day} recipes={week.recipes} />
          ))}
        </ol>
      )}
    </Page>
  )
}

function DayRow({ day, recipes }: { day: Day; recipes: RecipeOption[] }) {
  const isToday = day.date === todayIso()
  return (
    <li
      className={cn(
        'grid gap-3 border-b border-border py-4 sm:grid-cols-[7rem_1fr_1fr]',
        day.past && 'opacity-60'
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-ink sm:flex-col sm:items-start sm:gap-0.5">
        {formatShortDay(day.date)}
        {isToday && <span className="text-label font-normal text-accent-ink">Aujourd’hui</span>}
      </p>
      {MEAL_SLOTS.map((slot) => (
        <Slot
          key={slot}
          day={day}
          slot={slot}
          meals={day.meals[slot]}
          recipes={recipes}
          proposal={slot === 'dinner' ? day.proposal : null}
        />
      ))}
    </li>
  )
}

function Slot({
  day,
  slot,
  meals,
  recipes,
  proposal,
}: {
  day: Day
  slot: MealSlot
  meals: MealPlanRow[]
  recipes: RecipeOption[]
  proposal: Day['proposal']
}) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-xs font-medium text-muted">{slotLabels[slot]}</p>
      {meals.map((meal) => (
        <PlannedMeal key={meal.id} meal={meal} past={day.past} />
      ))}
      {meals.length === 0 && proposal && !adding && (
        <div className="flex flex-col gap-1.5 rounded-card border border-dashed border-menu/50 bg-menu-soft/40 px-3 py-2">
          <p className="text-label text-menu-ink">Proposition</p>
          <Link
            route="recipes.show"
            routeParams={{ id: proposal.recipe.id }}
            className="truncate text-sm font-medium text-ink hover:underline"
          >
            {proposal.recipe.name}
          </Link>
          {proposal.reasons[0] && <p className="text-label text-muted">{proposal.reasons[0]}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                plan({
                  recipeId: proposal.recipe.id,
                  plannedOn: day.date,
                  slot,
                  servings: proposal.recipe.servings,
                })
              }
            >
              Garder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
              Autre recette
            </Button>
          </div>
        </div>
      )}
      {!day.past &&
        (adding ? (
          <AddMeal date={day.date} slot={slot} recipes={recipes} onDone={() => setAdding(false)} />
        ) : (
          (meals.length > 0 || !proposal) && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-8 w-fit items-center rounded-control px-2 text-label text-muted hover:bg-hover hover:text-accent-ink"
            >
              + Ajouter
            </button>
          )
        ))}
    </div>
  )
}

function PlannedMeal({ meal, past }: { meal: MealPlanRow; past: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-card bg-callout px-3 py-2">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-menu" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          route="recipes.show"
          routeParams={{ id: meal.recipe.id }}
          className="truncate text-sm font-medium text-ink hover:underline"
        >
          {meal.recipe.name}
        </Link>
        <span className="text-label text-muted">{meal.servings} pers.</span>
      </div>
      {meal.outcome && (
        <StatusTag
          status={meal.outcome === 'cooked' ? 'done' : 'planned'}
          label={mealOutcomeLabels[meal.outcome]}
        />
      )}
      {!past && (
        <button
          type="button"
          aria-label={`Retirer ${meal.recipe.name} de la semaine`}
          title="Retirer"
          onClick={() =>
            router.delete(urlFor('meals.destroy', { id: meal.id }), { preserveScroll: true })
          }
          className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
        >
          <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/**
 * A recipe and a number of people for one slot; the servings follow the
 * recipe chosen until changed.
 */
function AddMeal({
  date,
  slot,
  recipes,
  onDone,
}: {
  date: string
  slot: MealSlot
  recipes: RecipeOption[]
  onDone: () => void
}) {
  const [recipeId, setRecipeId] = useState(recipes[0].id)
  const [servings, setServings] = useState(recipes[0].servings)
  const label = `${slotLabels[slot]} du ${formatShortDay(date)}`

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        router.post(
          urlFor('meals.store'),
          { recipeId, plannedOn: date, slot, servings },
          { preserveScroll: true, onSuccess: onDone }
        )
      }}
    >
      <select
        aria-label={`Recette, ${label}`}
        value={recipeId}
        onChange={(event) => {
          const id = Number(event.target.value)
          setRecipeId(id)
          setServings(recipes.find((recipe) => recipe.id === id)?.servings ?? servings)
        }}
        className="h-8 min-w-0 flex-1 rounded-control border border-border bg-bg px-2 text-sm text-ink focus:border-accent focus:outline-none"
      >
        {recipes.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>
            {recipe.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        max={50}
        aria-label={`Personnes, ${label}`}
        value={servings}
        onChange={(event) => setServings(Number(event.target.value))}
        className="h-8 w-16 rounded-control border border-border bg-bg px-2 text-right text-sm text-ink focus:border-accent focus:outline-none"
      />
      <Button type="submit" size="sm">
        Prévoir
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        Annuler
      </Button>
    </form>
  )
}

Week.layout = [AppShell]
