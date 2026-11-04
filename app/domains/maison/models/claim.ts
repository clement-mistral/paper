import { ClaimSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Contract from '#domains/maison/models/contract'
import type { ClaimStatus } from '#shared/types/maison'

export default class Claim extends ClaimSchema {
  @column()
  declare status: ClaimStatus

  @belongsTo(() => Contract)
  declare contract: BelongsTo<typeof Contract>
}
