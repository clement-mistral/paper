import { CaptureAliasSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

/**
 * Entities a phrase can resolve to.
 */
export type AliasEntityType =
  | 'envelope'
  | 'account'
  | 'recipe'
  | 'ingredient'
  | 'vehicle'
  | 'subscription'
  /** A phrase the user said belongs to an intent; the id is its index in INTENT_NAMES. */
  | 'intent'

export type AliasOrigin = 'manual' | 'learned'

export default class CaptureAlias extends CaptureAliasSchema {
  @column()
  declare entityType: AliasEntityType

  @column()
  declare origin: AliasOrigin
}
