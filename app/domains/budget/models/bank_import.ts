import { BankImportSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import BankImportLine from '#domains/budget/models/bank_import_line'

export default class BankImport extends BankImportSchema {
  @column()
  declare format: 'csv' | 'ofx'

  @column()
  declare status: 'pending' | 'done'

  @hasMany(() => BankImportLine)
  declare lines: HasMany<typeof BankImportLine>
}
