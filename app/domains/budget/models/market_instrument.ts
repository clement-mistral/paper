import { MarketInstrumentSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { MarketKind } from '#shared/types/budget'

/** A quoted value, keyed by its Yahoo Finance symbol. */
export default class MarketInstrument extends MarketInstrumentSchema {
  static selfAssignPrimaryKey = true

  @column()
  declare kind: MarketKind
}
