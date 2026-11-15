import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import DailyReview from '#domains/routine/models/daily_review'
import Habit from '#domains/routine/models/habit'
import HabitCheck from '#domains/routine/models/habit_check'
import { deadlineOf, EVENING_HOUR, isOpen, streaks } from '#domains/routine/services/review_window'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import TransactionService from '#domains/budget/services/transaction_service'
import TaskService from '#domains/lists/services/task_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import MoneyView from '#views/money_view'
import { fromIsoDate, now, toIsoDate, today } from '#support/dates'
import type { MealOutcome } from '#shared/types/menu'
import type {
  DailyReview as DailyReviewData,
  Mood,
  ReviewSection,
  RoutineStatus,
  Streak,
} from '#shared/types/routine'

/**
 * Days shown in the streak calendar (26 weeks).
 */
const CALENDAR_DAYS = 182

/**
 * Public service of the Routine module: the daily review and habits. It
 * reads and acts on the other domains only through their services.
 *
 * Each person of the household has their own review (validation, mood,
 * note, habits, streak); what it sorts (expenses, tasks, meals) is the
 * household's, so a task one person triaged is already done for the other.
 */
@inject()
export default class RoutineService {
  constructor(
    private transactions: TransactionService,
    private envelopes: EnvelopeService,
    private accounts: AccountService,
    private tasks: TaskService,
    private meals: MealPlanService,
    private money: MoneyView
  ) {}

  /**
   * Which review is waiting: yesterday's until noon if not done, else
   * today's.
   */
  async status(userId: number, at: DateTime = now()): Promise<RoutineStatus> {
    const day = at.startOf('day')
    const yesterday = day.minus({ days: 1 })
    const [completed, streak] = await Promise.all([
      this.completedDays(userId, [toIsoDate(yesterday), toIsoDate(day)]),
      this.streak(userId, day),
    ])

    let due: RoutineStatus['due'] = null
    if (
      !completed.has(toIsoDate(yesterday)) &&
      isOpen(yesterday, at) &&
      (await this.hadActivity(userId, yesterday))
    ) {
      due = {
        day: toIsoDate(yesterday),
        label: 'yesterday',
        deadline: deadlineOf(yesterday).toISO()!,
      }
    } else if (!completed.has(toIsoDate(day))) {
      due = { day: toIsoDate(day), label: 'today', deadline: deadlineOf(day).toISO()! }
    }

    return {
      streak: streak.current,
      due,
      evening: at.hour >= EVENING_HOUR,
      todayCompleted: completed.has(toIsoDate(day)),
    }
  }

  async review(userId: number, dayIso: string, at: DateTime = now()): Promise<DailyReviewData> {
    const day = fromIsoDate(dayIso)
    const [review, expenses, tasks, meals, habits, checks] = await Promise.all([
      DailyReview.query().where({ userId, day: dayIso }).first(),
      this.money.transactionsOn(dayIso),
      this.tasks.forReview(dayIso),
      this.meals.between(dayIso, dayIso),
      this.activeHabits(userId),
      HabitCheck.query()
        .where('day', dayIso)
        .whereIn('habit_id', Habit.query().select('id').where('user_id', userId)),
    ])

    const spent = expenses.filter((row) => row.kind === 'expense')
    const moneyConfirmed = review?.moneyConfirmed ?? false
    const pending: ReviewSection[] = []
    if (!moneyConfirmed) pending.push('money')
    if (tasks.open.length > 0) pending.push('tasks')
    if (meals.some((meal) => meal.outcome === null)) pending.push('meals')

    const done = new Set(checks.map((check) => check.habitId))
    return {
      day: dayIso,
      open: isOpen(day, at) && !review?.completedAt,
      deadline: deadlineOf(day).toISO()!,
      completed: !!review?.completedAt,
      moneyConfirmed,
      expenses: spent,
      spentCents: spent.reduce((total, row) => total - row.amountCents, 0),
      tasks,
      meals,
      habits: habits.map((habit) => ({ id: habit.id, name: habit.name, done: done.has(habit.id) })),
      mood: review?.mood ?? null,
      note: review?.note ?? null,
      pending,
    }
  }

  /**
   * Refuses any change to a locked day (past the noon deadline) or an
   * already validated one.
   */
  async assertOpen(userId: number, dayIso: string, at: DateTime = now()) {
    const review = await DailyReview.query().where({ userId, day: dayIso }).first()
    if (review?.completedAt) {
      throw new Exception('Cette journée est déjà validée', { status: 422 })
    }
    if (!isOpen(fromIsoDate(dayIso), at)) {
      throw new Exception('Le bilan de ce jour n’est plus modifiable', { status: 422 })
    }
  }

  async confirmMoney(userId: number, dayIso: string) {
    await this.assertOpen(userId, dayIso)
    await this.upsert(userId, dayIso, { moneyConfirmed: true })
  }

  async journal(
    userId: number,
    dayIso: string,
    input: { mood?: Mood | null; note?: string | null }
  ) {
    await this.assertOpen(userId, dayIso)
    await this.upsert(userId, dayIso, { mood: input.mood ?? null, note: input.note ?? null })
  }

  async toggleHabit(userId: number, dayIso: string, habitId: number) {
    await this.assertOpen(userId, dayIso)
    await Habit.query().where({ id: habitId, userId }).firstOrFail()
    const check = await HabitCheck.query().where({ habitId, day: dayIso }).first()
    if (check) await check.delete()
    else await HabitCheck.create({ habitId, day: fromIsoDate(dayIso) })
  }

  /**
   * Records what happened to a planned meal. Eaten out, it becomes an
   * expense (« Resto » envelope when it exists) dated on the review day.
   */
  async mealOutcome(
    userId: number,
    dayIso: string,
    mealId: number,
    outcome: MealOutcome,
    amountCents?: number | null
  ) {
    await this.assertOpen(userId, dayIso)
    await db.transaction(async (trx) => {
      await this.meals.setOutcome(mealId, outcome, trx)
      await this.transactions.deleteForSource('meal_plan', mealId, trx)
      if (outcome === 'eaten_out' && amountCents && amountCents > 0) {
        const [envelope, account] = await Promise.all([
          this.envelopes.match('resto restaurant'),
          this.accounts.defaultAccount(trx),
        ])
        await this.transactions.recordExpense(
          {
            amountCents,
            label: 'Repas dehors',
            occurredOn: dayIso,
            envelopeId: envelope?.id ?? null,
            accountId: account?.id ?? null,
          },
          trx,
          { domain: 'menu', sourceType: 'meal_plan', sourceId: mealId }
        )
      }
    })
  }

  /**
   * Validates the day once money, tasks and meals have been reviewed.
   */
  async complete(userId: number, dayIso: string): Promise<Streak> {
    await this.assertOpen(userId, dayIso)
    const review = await this.review(userId, dayIso)
    if (review.pending.length > 0) {
      throw new Exception('Il reste des sections à compléter', { status: 422 })
    }
    await this.upsert(userId, dayIso, { completedAt: DateTime.now() })
    return this.streak(userId, today())
  }

  async streak(userId: number, day: DateTime = today()): Promise<Streak> {
    const rows = await DailyReview.query()
      .where('user_id', userId)
      .whereNotNull('completed_at')
      .select('day')
    const completed = new Set(rows.map((row) => toIsoDate(row.day)))
    const { current, best } = streaks(completed, day)
    return {
      current,
      best,
      days: Array.from({ length: CALENDAR_DAYS }, (_, index) => {
        const date = toIsoDate(day.minus({ days: CALENDAR_DAYS - 1 - index }))
        return { day: date, completed: completed.has(date) }
      }),
    }
  }

  async habits(userId: number) {
    const habits = await this.activeHabits(userId)
    return habits.map(({ id, name }) => ({ id, name }))
  }

  async addHabit(userId: number, name: string) {
    const last = await Habit.query().where('user_id', userId).max('position as max').first()
    await Habit.create({ userId, name, position: Number(last?.$extras.max ?? -1) + 1 })
  }

  /**
   * Archived rather than deleted: past checks keep their meaning.
   */
  async archiveHabit(userId: number, id: number) {
    const habit = await Habit.query().where({ id, userId }).firstOrFail()
    habit.archivedAt = DateTime.now()
    await habit.save()
  }

  private activeHabits(userId: number) {
    return Habit.query()
      .where('user_id', userId)
      .whereNull('archived_at')
      .orderBy('position')
      .orderBy('id')
  }

  private async upsert(
    userId: number,
    dayIso: string,
    values: Partial<Pick<DailyReview, 'moneyConfirmed' | 'mood' | 'note' | 'completedAt'>>
  ) {
    const review = await DailyReview.firstOrNew({ userId, day: fromIsoDate(dayIso) }, {})
    review.merge(values)
    await review.save()
  }

  private async completedDays(userId: number, days: string[]): Promise<Set<string>> {
    const rows = await DailyReview.query()
      .where('user_id', userId)
      .whereIn('day', days)
      .whereNotNull('completed_at')
    return new Set(rows.map((row) => toIsoDate(row.day)))
  }

  /**
   * Yesterday is only nagged about when something happened that day or
   * the streak is running (a first-time user is not asked about the past).
   */
  private async hadActivity(userId: number, day: DateTime): Promise<boolean> {
    const before = await this.completedDays(userId, [toIsoDate(day.minus({ days: 1 }))])
    if (before.size > 0) return true
    const [expenses, tasks] = await Promise.all([
      this.money.transactionsOn(toIsoDate(day)),
      this.tasks.dueUntil(toIsoDate(day)),
    ])
    return expenses.length > 0 || tasks.length > 0
  }
}
