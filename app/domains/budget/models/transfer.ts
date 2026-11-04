import { TransferSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from '#domains/budget/models/account'

export default class Transfer extends TransferSchema {
  @belongsTo(() => Account, { foreignKey: 'fromAccountId' })
  declare fromAccount: BelongsTo<typeof Account>

  @belongsTo(() => Account, { foreignKey: 'toAccountId' })
  declare toAccount: BelongsTo<typeof Account>
}
