import { DailyReviewSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { Mood } from '#shared/types/routine'

export default class DailyReview extends DailyReviewSchema {
  @column()
  declare mood: Mood | null
}
