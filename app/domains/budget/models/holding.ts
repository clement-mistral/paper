import { HoldingSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { AssetClass } from '#shared/types/budget'
import Account from '#domains/budget/models/account'
import InvestmentOperation from '#domains/budget/models/investment_operation'

/** A line of an investment account: a share, a fund, a coin… */
export default class Holding extends HoldingSchema {
  @column()
  declare assetClass: AssetClass

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @hasMany(() => InvestmentOperation)
  declare operations: HasMany<typeof InvestmentOperation>
}
