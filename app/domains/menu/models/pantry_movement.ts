import { PantryMovementSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { PantryLocation, Unit } from '#shared/types/menu'

export default class PantryMovement extends PantryMovementSchema {
  @column()
  declare location: PantryLocation

  @column()
  declare unit: Unit | null
}
