import { type ReactNode, useState } from 'react'
import { router } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { Check, CircleCheck, Flame, Lock, X } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import AmountCell from '~/components/domain/amount_cell'
import StreakCalendar from '~/components/domain/streak_calendar'
import Button from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import DomainTag from '~/components/ui/domain_tag'
import Page from '~/components/ui/page'
import ProgressBar from '~/components/ui/progress_bar'
import { cn } from '~/lib/cn'
import { formatAmount, formatLongDate, todayIso } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import { slotLabels } from '~/lib/labels'
import type { MealOutcome, MealPlanRow } from '#shared/types/menu'
import type { DailyReview, Mood, ReviewSection, Streak } from '#shared/types/routine'
import type { InertiaProps } from '~/types'

const MOOD_LABELS: Record<Mood, string> = {
  1: 'Difficile',
  2: 'Moyenne',
  3: 'Correcte',
  4: 'Bonne',
  5: 'Excellente',
}

const OUTCOME_LABELS: Record<MealOutcome, string> = {
  cooked: 'Cuisiné',
  other: 'Autre chose',
  eaten_out: 'Mangé dehors',
}

const SECTION_LABELS: Record<ReviewSection, string> = {
  money: 'confirmer l’argent du jour',
  tasks: 'trier les tâches',
  meals: 'dire ce qui a été mangé',
}

const options = { preserveScroll: true }

/**
 * A step of the review, with its done state.
 */
function Step({
  index,
  title,
  done,
  children,
}: {
  index: number
  title: string
  done: boolean
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-3 border-b border-border pb-2">
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
            done ? 'bg-ink text-bg' : 'border border-border text-muted'
          )}
          aria-hidden="true"
        >
          {done ? <Check size={13} strokeWidth={2.4} /> : index}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {done && <span className="text-label text-muted">fait</span>}
      </header>
      {children}
    </section>
  )
}

function Money({ review }: { review: DailyReview }) {
  const [text, setText] = useState('')
  return (
    <Step index={1} title="Argent du jour" done={review.moneyConfirmed}>
      {review.expenses.length === 0 ? (
        <p className="text-sm text-muted">Aucune dépense enregistrée ce jour.</p>
      ) : (
        <ul className="flex flex-col">
          {review.expenses.map((row) => (
            <li key={row.id} className="flex min-h-9 items-center gap-3 border-b border-border">
              <span className="flex-1 text-sm">{row.label}</span>
              {row.envelope && <span className="text-label text-muted">{row.envelope.name}</span>}
              <DomainTag domain={row.domain} className="hidden sm:inline-flex" />
              <AmountCell cents={row.amountCents} />
            </li>
          ))}
          <li className="flex min-h-9 items-center justify-between text-sm font-medium">
            <span>Total</span>
            <span>{formatAmount(review.spentCents)}</span>
          </li>
        </ul>
      )}

      {review.open && (
        <>
          <Form
            route="reviews.expense"
            routeParams={{ day: review.day }}
            options={options}
            onSuccess={() => setText('')}
            className="flex gap-2"
          >
            {({ processing }) => (
              <>
                <label htmlFor="review-expense" className="sr-only">
                  Ajouter une dépense oubliée
                </label>
                <input
                  id="review-expense"
                  name="text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Une dépense oubliée ? « boulangerie 3,20 »"
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-sm placeholder:text-muted/70 focus:border-ink focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={processing || text.trim() === ''}
                >
                  Ajouter
                </Button>
              </>
            )}
          </Form>
          {!review.moneyConfirmed && (
            <div>
              <Button
                variant="secondary"
                onClick={() =>
                  router.post(urlFor('reviews.money', { day: review.day }), {}, options)
                }
              >
                <Check size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                C’est tout pour aujourd’hui
              </Button>
            </div>
          )}
        </>
      )}
    </Step>
  )
}

function Tasks({ review }: { review: DailyReview }) {
  const act = (id: number, action: 'done' | 'tomorrow' | 'later' | 'cancel') =>
    router.post(urlFor('reviews.task', { day: review.day, id }), { action }, options)

  const { open, closed } = review.tasks
  return (
    <Step index={2} title="Tâches" done={open.length === 0}>
      {open.length === 0 && closed.length === 0 && (
        <p className="text-sm text-muted">Rien n’était prévu.</p>
      )}
      <ul className="flex flex-col">
        {open.map((task) => (
          <li
            key={task.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2"
          >
            <span className="min-w-0 flex-1 text-sm">
              {task.title}
              {task.overdue && <span className="ml-2 text-label text-danger">en retard</span>}
            </span>
            {review.open && (
              <span className="flex flex-wrap gap-1">
                <Button size="sm" onClick={() => act(task.id, 'done')}>
                  Fait
                </Button>
                <Button size="sm" variant="secondary" onClick={() => act(task.id, 'tomorrow')}>
                  Demain
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act(task.id, 'later')}>
                  Plus tard
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act(task.id, 'cancel')}>
                  Abandonner
                </Button>
              </span>
            )}
          </li>
        ))}
        {closed.map((task) => (
          <li key={task.id} className="flex min-h-9 items-center gap-3 border-b border-border">
            {task.cancelled ? (
              <X size={15} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-muted" />
            ) : (
              <Check
                size={15}
                strokeWidth={ICON_STROKE}
                aria-hidden="true"
                className="text-success"
              />
            )}
            <span className="flex-1 text-sm text-muted line-through">{task.title}</span>
            <span className="text-label text-muted">{task.cancelled ? 'abandonnée' : 'faite'}</span>
          </li>
        ))}
      </ul>
    </Step>
  )
}

function MealRow({ day, meal, open }: { day: string; meal: MealPlanRow; open: boolean }) {
  const [eatingOut, setEatingOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const set = (outcome: MealOutcome, extra: Record<string, string> = {}) =>
    router.post(
      urlFor('reviews.meal', { day, id: meal.id }),
      { outcome, ...extra },
      {
        ...options,
        onSuccess: () => {
          setEatingOut(false)
          setEditing(false)
        },
      }
    )

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-2">
      <span className="min-w-0 flex-1 text-sm">
        <span className="text-muted">{slotLabels[meal.slot]} · </span>
        {meal.recipe.name}
      </span>
      {meal.outcome && !editing ? (
        <span className="flex items-center gap-2 text-label text-muted">
          {OUTCOME_LABELS[meal.outcome]}
          {open && (
            <button type="button" className="underline" onClick={() => setEditing(true)}>
              Modifier
            </button>
          )}
        </span>
      ) : open && eatingOut ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            set('eaten_out', amount.trim() ? { amount } : {})
          }}
        >
          <label htmlFor={`meal-amount-${meal.id}`} className="sr-only">
            Montant
          </label>
          <input
            id={`meal-amount-${meal.id}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="Montant (€)"
            autoFocus
            className="h-8 w-28 rounded-control border border-border px-2 text-sm focus:border-ink focus:outline-none"
          />
          <Button size="sm" type="submit">
            Valider
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEatingOut(false)}>
            Annuler
          </Button>
        </form>
      ) : (
        open && (
          <span className="flex flex-wrap gap-1">
            <Button size="sm" onClick={() => set('cooked')}>
              Cuisiné
            </Button>
            <Button size="sm" variant="secondary" onClick={() => set('other')}>
              Autre chose
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEatingOut(true)}>
              Mangé dehors
            </Button>
          </span>
        )
      )}
    </li>
  )
}

function Meals({ review }: { review: DailyReview }) {
  const done = review.meals.every((meal) => meal.outcome !== null)
  return (
    <Step index={3} title="Repas" done={done}>
      {review.meals.length === 0 ? (
        <p className="text-sm text-muted">Aucun repas planifié.</p>
      ) : (
        <ul className="flex flex-col">
          {review.meals.map((meal) => (
            <MealRow key={meal.id} day={review.day} meal={meal} open={review.open} />
          ))}
        </ul>
      )}
    </Step>
  )
}

function Habits({
  review,
  habits,
}: {
  review: DailyReview
  habits: Array<{ id: number; name: string }>
}) {
  const [managing, setManaging] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState(review.note ?? '')

  const saveJournal = (mood: Mood | null) =>
    router.put(urlFor('reviews.journal', { day: review.day }), { mood, note }, options)

  return (
    <Step index={4} title="Habitudes et humeur" done={review.mood !== null}>
      <div className="flex flex-col gap-1">
        {review.habits.length === 0 && !managing && (
          <p className="text-sm text-muted">
            Aucune habitude suivie. Ajoutez-en (sport, lecture…) pour les cocher chaque jour.
          </p>
        )}
        {review.habits.map((habit) => (
          <label key={habit.id} className="flex min-h-9 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={habit.done}
              disabled={!review.open}
              onChange={() =>
                router.post(urlFor('reviews.habit', { day: review.day, id: habit.id }), {}, options)
              }
              className="size-4 accent-ink"
            />
            <span className="text-sm">{habit.name}</span>
          </label>
        ))}
        <div>
          <Button size="sm" variant="ghost" onClick={() => setManaging((value) => !value)}>
            {managing ? 'Terminé' : 'Gérer les habitudes'}
          </Button>
        </div>
        {managing && (
          <div className="flex flex-col gap-2 rounded-card bg-callout p-3">
            {habits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between gap-2 text-sm">
                {habit.name}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.delete(urlFor('habits.archive', { id: habit.id }), options)}
                >
                  Retirer
                </Button>
              </div>
            ))}
            <Form
              route="habits.store"
              options={options}
              onSuccess={() => setName('')}
              className="flex gap-2"
            >
              <label htmlFor="habit-name" className="sr-only">
                Nouvelle habitude
              </label>
              <input
                id="habit-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nouvelle habitude"
                className="h-8 min-w-0 flex-1 rounded-control border border-border bg-bg px-2 text-sm focus:border-ink focus:outline-none"
              />
              <Button size="sm" type="submit" variant="secondary" disabled={name.trim() === ''}>
                Ajouter
              </Button>
            </Form>
          </div>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-muted">Comment s’est passée la journée ?</legend>
        <div className="flex flex-wrap gap-1">
          {([1, 2, 3, 4, 5] as const).map((mood) => (
            <button
              key={mood}
              type="button"
              aria-pressed={review.mood === mood}
              disabled={!review.open}
              onClick={() => saveJournal(mood)}
              className={cn(
                'h-8 rounded-control border px-3 text-label transition-colors',
                review.mood === mood
                  ? 'border-ink bg-ink text-bg'
                  : 'border-border text-ink hover:bg-hover'
              )}
            >
              {MOOD_LABELS[mood]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-note" className="text-label text-muted">
          Une note sur la journée (facultatif)
        </label>
        <textarea
          id="review-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => note !== (review.note ?? '') && saveJournal(review.mood)}
          disabled={!review.open}
          rows={3}
          className="rounded-control border border-border bg-bg px-2.5 py-2 text-sm focus:border-ink focus:outline-none"
        />
      </div>
    </Step>
  )
}

export default function Review({
  review,
  streak,
  habits,
}: InertiaProps<{
  review: DailyReview
  streak: Streak
  habits: Array<{ id: number; name: string }>
}>) {
  const steps = 3
  const done = steps - review.pending.length
  const isToday = review.day === todayIso()

  return (
    <Page
      title={isToday ? 'Bilan du jour' : 'Bilan d’hier'}
      description={formatLongDate(review.day)}
      actions={
        <span className="inline-flex items-center gap-2 text-sm">
          <Flame size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span>
            <strong className="font-semibold">{streak.current}</strong> jour
            {streak.current > 1 ? 's' : ''} de suite
          </span>
          <span className="text-label text-muted">· record {streak.best}</span>
        </span>
      }
    >
      {review.completed ? (
        <Callout
          icon={<CircleCheck size={16} strokeWidth={ICON_STROKE} />}
          title={
            streak.current > 1
              ? `Journée validée · ${streak.current} jours de suite`
              : 'Journée validée'
          }
        >
          {formatAmount(review.spentCents)} suivis ·{' '}
          {review.tasks.closed.filter((t) => !t.cancelled).length} tâche(s) faite(s) · à demain
          soir.
        </Callout>
      ) : !review.open ? (
        <Callout icon={<Lock size={16} strokeWidth={ICON_STROKE} />} title="Bilan verrouillé">
          Le bilan d’un jour se fait jusqu’au lendemain midi.
        </Callout>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-label text-muted">
            <span>
              {done} étape{done > 1 ? 's' : ''} sur {steps}
            </span>
            <span>À faire avant {isToday ? 'demain midi' : 'midi'}</span>
          </div>
          <ProgressBar value={done / steps} label="Avancement du bilan" />
        </div>
      )}

      <Money review={review} />
      <Tasks review={review} />
      <Meals review={review} />
      <Habits review={review} habits={habits} />

      {review.open && (
        <div className="flex flex-col items-start gap-2 border-t border-border pt-6">
          <Button
            disabled={review.pending.length > 0}
            onClick={() =>
              router.post(urlFor('reviews.complete', { day: review.day }), {}, options)
            }
          >
            <Check size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Valider la journée
          </Button>
          {review.pending.length > 0 && (
            <p className="text-label text-muted">
              Encore : {review.pending.map((section) => SECTION_LABELS[section]).join(', ')}.
            </p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="border-b border-border pb-2 text-base font-semibold">Série</h2>
        <StreakCalendar streak={streak} />
      </section>
    </Page>
  )
}

Review.layout = [AppShell]
