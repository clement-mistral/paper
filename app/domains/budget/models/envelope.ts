import { EnvelopeSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Transaction from '#domains/budget/models/transaction'

export default class Envelope extends EnvelopeSchema {
  @hasMany(() => Transaction)
  declare transactions: HasMany<typeof Transaction>
}
