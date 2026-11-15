import { ShoppingItemSchema } from '#database/schema'
import { beforeCreate, column } from '@adonisjs/lucid/orm'
import { currentUserId } from '#support/actor'
import type { Domain } from '#shared/types/domain'

export default class ShoppingItem extends ShoppingItemSchema {
  @column()
  declare reasonDomain: Domain | null

  @beforeCreate()
  static attribute(item: ShoppingItem) {
    item.addedById ??= currentUserId()
  }
}
