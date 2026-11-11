import { InvestmentOperationSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { OperationKind } from '#shared/types/budget'
import Holding from '#domains/budget/models/holding'

/** A purchase, a sale, a dividend or a fee on a line. */
export default class InvestmentOperation extends InvestmentOperationSchema {
  @column()
  declare kind: OperationKind

  @belongsTo(() => Holding)
  declare holding: BelongsTo<typeof Holding>
}
