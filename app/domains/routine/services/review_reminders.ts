import { type DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import ReviewReminderSetting from '#domains/routine/models/review_reminder_setting'
import RoutineService from '#domains/routine/services/routine_service'
import { deadlineOf, GRACE_HOUR, MORNING_HOUR } from '#domains/routine/services/review_window'
import PushService from '#domains/notifications/services/push_service'
import { fromIsoDate, now, toIsoDate } from '#support/dates'
import type { PushMessage, ReviewReminderSettings } from '#shared/types/notifications'
import type { DailyReview, RoutineStatus } from '#shared/types/routine'

export type Reminder = 'evening' | 'morning'

const DEFAULTS: ReviewReminderSettings = {
  eveningEnabled: true,
  eveningTime: '21:00',
  morningEnabled: true,
}

type ReminderState = ReviewReminderSettings & {
  eveningSentOn: string | null
  morningSentOn: string | null
}

/**
 * Which reminder is due at `at`, if any:
 * - evening: from the chosen time until midnight, today's review not done;
 * - morning: from 10:00 until the noon deadline, yesterday's still waiting.
 * Each is sent at most once a day.
 */
export function dueReminder(
  at: DateTime,
  state: ReminderState,
  status: Pick<RoutineStatus, 'due' | 'todayCompleted'>
): Reminder | null {
  const day = toIsoDate(at)

  const [hour, minute] = state.eveningTime.split(':').map(Number)
  const eveningStart = at.startOf('day').set({ hour, minute })
  if (
    state.eveningEnabled &&
    at >= eveningStart &&
    state.eveningSentOn !== day &&
    !status.todayCompleted
  ) {
    return 'evening'
  }

  if (
    state.morningEnabled &&
    at.hour >= MORNING_HOUR &&
    at.hour < GRACE_HOUR &&
    state.morningSentOn !== day &&
    status.due?.label === 'yesterday'
  ) {
    return 'morning'
  }

  return null
}

/**
 * The notification text: what is left to do in the review.
 */
export function reminderMessage(
  reminder: Reminder,
  review: Pick<DailyReview, 'day' | 'moneyConfirmed' | 'tasks' | 'meals'>,
  streak: number
): PushMessage {
  const left: string[] = []
  if (!review.moneyConfirmed) left.push('l’argent du jour')
  const tasks = review.tasks.open.length
  if (tasks > 0) left.push(tasks === 1 ? '1 tâche' : `${tasks} tâches`)
  const meals = review.meals.filter((meal) => meal.outcome === null).length
  if (meals > 0) left.push(meals === 1 ? '1 repas' : `${meals} repas`)

  const todo = left.length > 0 ? `À trier : ${joinFr(left)}.` : 'Tout est prêt, il reste à valider.'
  const url = `/bilan/${review.day}`

  if (reminder === 'morning') {
    const keep = streak > 0 ? ` pour garder votre série de ${streak} j` : ''
    return {
      title: 'Bilan d’hier',
      body: `Encore possible jusqu’à midi${keep}. ${todo}`,
      url,
      tag: 'bilan',
    }
  }

  const series = streak > 0 ? ` Série en cours : ${streak} j.` : ''
  return { title: 'Bilan du soir', body: `${todo}${series}`, url, tag: 'bilan' }
}

function joinFr(parts: string[]): string {
  return parts.length <= 1
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`
}

/**
 * Reminders of the daily review, sent as push notifications by the
 * scheduler (`start/scheduler.ts`).
 */
@inject()
export default class ReviewReminders {
  constructor(
    private routine: RoutineService,
    private push: PushService
  ) {}

  async settings(): Promise<ReviewReminderSettings> {
    const row = await ReviewReminderSetting.query().orderBy('id').first()
    if (!row) return { ...DEFAULTS }
    return {
      eveningEnabled: row.eveningEnabled,
      eveningTime: row.eveningTime,
      morningEnabled: row.morningEnabled,
    }
  }

  async saveSettings(input: ReviewReminderSettings) {
    const row = await this.row()
    row.merge(input)
    await row.save()
  }

  /**
   * Sends the reminder due now, if any. Idempotent: the day is recorded
   * before sending, so a reminder is never sent twice.
   */
  async run(at: DateTime = now()): Promise<Reminder | null> {
    if (!this.push.configured) return null

    const row = await this.row()
    const status = await this.routine.status(at)
    const reminder = dueReminder(
      at,
      {
        eveningEnabled: row.eveningEnabled,
        eveningTime: row.eveningTime,
        morningEnabled: row.morningEnabled,
        eveningSentOn: row.eveningSentOn ? toIsoDate(row.eveningSentOn) : null,
        morningSentOn: row.morningSentOn ? toIsoDate(row.morningSentOn) : null,
      },
      status
    )
    if (!reminder) return null

    if (reminder === 'evening') row.eveningSentOn = at.startOf('day')
    else row.morningSentOn = at.startOf('day')
    await row.save()

    const day = reminder === 'evening' ? toIsoDate(at) : status.due!.day
    const review = await this.routine.review(day, at)
    // Kept by the push service until the review closes.
    const ttl = Math.max(60, Math.floor(deadlineOf(fromIsoDate(day)).diff(at).as('seconds')))
    await this.push.sendToAll(reminderMessage(reminder, review, status.streak), { ttl })
    return reminder
  }

  /**
   * A test notification from the profile, with today's real content.
   */
  async test(at: DateTime = now()): Promise<number> {
    const status = await this.routine.status(at)
    const review = await this.routine.review(toIsoDate(at), at)
    return this.push.sendToAll(reminderMessage('evening', review, status.streak), { ttl: 600 })
  }

  private async row(): Promise<ReviewReminderSetting> {
    const existing = await ReviewReminderSetting.query().orderBy('id').first()
    return existing ?? ReviewReminderSetting.create({ ...DEFAULTS })
  }
}
