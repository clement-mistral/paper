/*
|--------------------------------------------------------------------------
| Scheduled jobs (web server only)
|--------------------------------------------------------------------------
|
| Paper runs as a single self-hosted process, so scheduled work lives in
| the web server: subscription debits are recorded at boot (catching up
| any missed day) and automatic tasks are reconciled (a bill becoming due
| soon), at boot and then every hour. Both jobs are idempotent.
| `node ace subscriptions:charge` runs the debits by hand.
|
*/

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

const EVERY_HOUR = 60 * 60 * 1000

let timer: NodeJS.Timeout | undefined

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

async function hourly() {
  await chargeSubscriptions()
  await syncTasks()
  await refreshNews()
}

await app.ready(async () => {
  await hourly()
  timer = setInterval(hourly, EVERY_HOUR)
})

app.terminating(() => clearInterval(timer))
