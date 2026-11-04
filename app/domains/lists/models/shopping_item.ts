import { ShoppingItemSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { Domain } from '#shared/types/domain'

export default class ShoppingItem extends ShoppingItemSchema {
  @column()
  declare reasonDomain: Domain | null
}
