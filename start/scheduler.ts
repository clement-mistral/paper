/*
|--------------------------------------------------------------------------
| Scheduled jobs (web server only)
|--------------------------------------------------------------------------
|
| Paper runs as a single self-hosted process, so scheduled work lives in
| the web server: subscription debits are recorded at boot (catching up
| any missed day) and automatic tasks are reconciled (a bill becoming due
| soon), at boot and then every hour. Both jobs are idempotent.
| `node ace subscriptions:charge` runs the debits by hand. The reminders
| of the daily review (push notifications) are checked every 5 minutes;
| each one is sent at most once a day.
|
*/

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

const EVERY_HOUR = 60 * 60 * 1000
const EVERY_FIVE_MINUTES = 5 * 60 * 1000

let timer: NodeJS.Timeout | undefined
let reminderTimer: NodeJS.Timeout | undefined
let remindersRunning = false

async function chargeSubscriptions() {
  try {
    const { default: SubscriptionService } =
      await import('#domains/maison/services/subscription_service')
    const subscriptions = await app.container.make(SubscriptionService)
    await subscriptions.chargeDue()
  } catch (error) {
    logger.error({ err: error }, 'subscription debits failed')
  }
}

async function syncTasks() {
  try {
    const { default: AutomaticTasks } = await import('#domains/lists/services/automatic_tasks')
    const tasks = await app.container.make(AutomaticTasks)
    await tasks.sync()
  } catch (error) {
    logger.error({ err: error }, 'automatic tasks sync failed')
  }
}

async function refreshNews() {
  try {
    const { default: NewsService } = await import('#domains/news/services/news_service')
    const news = await app.container.make(NewsService)
    await news.refreshAll()
  } catch (error) {
    logger.error({ err: error }, 'news refresh failed')
  }
}

async function sendReviewReminders() {
  if (remindersRunning) return
  remindersRunning = true
  try {
    const { default: ReviewReminders } = await import('#domains/routine/services/review_reminders')
    const reminders = await app.container.make(ReviewReminders)
    await reminders.run()
  } catch (error) {
    logger.error({ err: error }, 'review reminders failed')
  } finally {
    remindersRunning = false
  }
}

async function hourly() {
  await chargeSubscriptions()
  await syncTasks()
  await refreshNews()
}

await app.ready(async () => {
  await hourly()
  timer = setInterval(hourly, EVERY_HOUR)
  await sendReviewReminders()
  reminderTimer = setInterval(sendReviewReminders, EVERY_FIVE_MINUTES)
})

app.terminating(() => {
  clearInterval(timer)
  clearInterval(reminderTimer)
})
