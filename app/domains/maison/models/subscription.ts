import { SubscriptionSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { Frequency } from '#shared/types/maison'

export default class Subscription extends SubscriptionSchema {
  @column()
  declare frequency: Frequency
}
