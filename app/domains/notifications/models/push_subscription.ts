import { PushSubscriptionSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

export default class PushSubscription extends PushSubscriptionSchema {
  /**
   * The generated name would map back to `p256_dh`.
   */
  @column({ columnName: 'p256dh' })
  declare p256Dh: string
}
