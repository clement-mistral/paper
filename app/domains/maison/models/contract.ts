import { ContractSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Subscription from '#domains/maison/models/subscription'
import Claim from '#domains/maison/models/claim'
import type { Domain } from '#shared/types/domain'
import type { ContractCategory } from '#shared/types/maison'

export default class Contract extends ContractSchema {
  @column()
  declare category: ContractCategory

  @column()
  declare domain: Domain

  @belongsTo(() => Subscription)
  declare subscription: BelongsTo<typeof Subscription>

  @hasMany(() => Claim)
  declare claims: HasMany<typeof Claim>
}
