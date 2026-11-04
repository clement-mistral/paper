import { Link } from '@adonisjs/inertia/react'
import { usePage } from '@inertiajs/react'
import { CalendarCheck, Flame, Newspaper, ShoppingBasket } from 'lucide-react'
import { buttonClasses } from '~/components/ui/button'
import AppShell from '~/layouts/app_shell'
import AgendaItemRow from '~/components/domain/agenda_item_row'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import { urlFor } from '~/client'
import { formatLongDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { AgendaItem, TodayOverview } from '#shared/types/agenda'
import type { InertiaProps } from '~/types'
import type { MealSuggestion } from '#shared/types/menu'
import MealSuggestions from '~/components/domain/meal_suggestions'

function Items({ items }: { items: AgendaItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <AgendaItemRow key={item.key} item={item} />
      ))}
    </ul>
  )
}

/**
 * Puts the daily review forward: yesterday's until noon, today's from
 * 18:00.
 */
function ReviewPrompt() {
  const { props } = usePage()
  const routine = props.routine
  if (!routine?.due) return null
  const yesterday = routine.due.label === 'yesterday'
  if (!yesterday && !routine.evening) return null

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card bg-callout px-4 py-3">
      <Flame size={18} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {yesterday
            ? 'Le bilan d’hier est à compléter avant midi'
            : 'C’est l’heure du bilan du jour'}
        </p>
        <p className="text-label text-muted">
          {routine.streak > 0
            ? `Gardez votre série : ${routine.streak} jour${routine.streak > 1 ? 's' : ''} de suite.`
            : 'Deux minutes pour faire le point : argent, tâches, repas.'}
        </p>
      </div>
      <Link route="reviews.show" routeParams={{ day: routine.due.day }} className={buttonClasses()}>
        Faire le bilan
      </Link>
    </div>
  )
}

export default function Today({
  overview,
  dinnerIdeas,
  routine,
}: InertiaProps<{ overview: TodayOverview; dinnerIdeas: MealSuggestion[] }>) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  return (
    <Page
      title="Aujourd’hui"
      description={formatLongDate(new Date())}
      actions={
        <>
          <Link
            route={routine?.evening ? 'newspapers.tomorrow' : 'newspapers.current'}
            className="inline-flex h-9 items-center gap-2 rounded-control border border-border px-3 text-label hover:bg-hover"
          >
            <Newspaper size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {routine?.evening ? 'Journal de demain' : 'Journal du jour'}
          </Link>
          {overview.shoppingCount > 0 && (
            <Link
              route="lists"
              className="inline-flex h-9 items-center gap-2 rounded-control border border-border px-3 text-label hover:bg-hover"
            >
              <ShoppingBasket size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
              {overview.shoppingCount} article{overview.shoppingCount > 1 ? 's' : ''} à acheter
            </Link>
          )}
        </>
      }
    >
      <ReviewPrompt />

      {overview.overdue.length > 0 && (
        <Section title="En retard">
          <Items items={overview.overdue} />
        </Section>
      )}

      <Section title="Aujourd’hui" action={{ label: 'Voir l’agenda', href: urlFor('agenda') }}>
        {overview.today.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={20} strokeWidth={ICON_STROKE} />}
            title="Rien de prévu"
          >
            Avec Ctrl K : « appeler le plombier 14h », « carbonara ce soir ».
          </EmptyState>
        ) : (
          <Items items={overview.today} />
        )}
      </Section>

      {dinnerIdeas.length > 0 && (
        <Section
          title="Idées pour ce soir"
          action={{ label: 'Toutes les recettes', href: urlFor('recipes.index') }}
        >
          <MealSuggestions suggestions={dinnerIdeas} compact />
        </Section>
      )}

      <Section title={`Demain · ${formatLongDate(tomorrow)}`}>
        {overview.tomorrow.length === 0 ? (
          <EmptyState title="Journée libre" />
        ) : (
          <Items items={overview.tomorrow} />
        )}
      </Section>

      {overview.someday.length > 0 && (
        <Section title="Sans date" action={{ label: 'Toutes les tâches', href: urlFor('lists') }}>
          <Items items={overview.someday} />
        </Section>
      )}
    </Page>
  )
}

Today.layout = [AppShell]
