import { InvestmentPlanSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from '#domains/budget/models/account'
import Holding from '#domains/budget/models/holding'

export default class InvestmentPlan extends InvestmentPlanSchema {
  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => Holding)
  declare holding: BelongsTo<typeof Holding>
}
