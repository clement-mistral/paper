import { AccountSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { AccountType, AccountWrapper } from '#shared/types/budget'
import Transaction from '#domains/budget/models/transaction'

export default class Account extends AccountSchema {
  @column()
  declare type: AccountType

  @column()
  declare wrapper: AccountWrapper | null

  @hasMany(() => Transaction)
  declare transactions: HasMany<typeof Transaction>
}
