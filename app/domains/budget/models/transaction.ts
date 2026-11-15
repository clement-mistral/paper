import { TransactionSchema } from '#database/schema'
import { beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { Domain } from '#shared/types/domain'
import Account from '#domains/budget/models/account'
import Envelope from '#domains/budget/models/envelope'
import { currentUserId } from '#support/actor'

export default class Transaction extends TransactionSchema {
  @column()
  declare domain: Domain

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => Envelope)
  declare envelope: BelongsTo<typeof Envelope>

  @beforeCreate()
  static attribute(transaction: Transaction) {
    transaction.createdById ??= currentUserId()
  }
}
