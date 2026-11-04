import { IngredientSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { Unit } from '#shared/types/menu'

export default class Ingredient extends IngredientSchema {
  @column()
  declare defaultUnit: Unit
}
