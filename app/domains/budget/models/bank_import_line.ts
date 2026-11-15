import { BankImportLineSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Transaction from '#domains/budget/models/transaction'
import type { BankLineStatus } from '#shared/types/budget'

export default class BankImportLine extends BankImportLineSchema {
  @column()
  declare status: BankLineStatus

  @belongsTo(() => Transaction, { foreignKey: 'matchedTransactionId' })
  declare matchedTransaction: BelongsTo<typeof Transaction>
}
