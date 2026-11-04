import { TransactionSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { Domain } from '#shared/types/domain'
import Account from '#domains/budget/models/account'
import Envelope from '#domains/budget/models/envelope'

export default class Transaction extends TransactionSchema {
  @column()
  declare domain: Domain

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => Envelope)
  declare envelope: BelongsTo<typeof Envelope>
}
