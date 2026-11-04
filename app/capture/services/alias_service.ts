import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CaptureAlias, { type AliasEntityType } from '#capture/models/capture_alias'
import { normalize } from '#capture/normalizer'

export type AliasMatch = { entityId: number; phrase: string }

/**
 * Phrases that resolve to an entity (« resto » → envelope #3). Manual
 * aliases come from fiche forms, learned ones from preview corrections.
 */
export default class AliasService {
  /**
   * Replaces the manual aliases of an entity.
   */
  async syncManual(
    entityType: AliasEntityType,
    entityId: number,
    phrases: string[],
    trx: TransactionClientContract
  ) {
    await CaptureAlias.query({ client: trx })
      .where({ entityType, entityId, origin: 'manual' })
      .delete()

    for (const phrase of phrases) {
      await this.upsert(entityType, entityId, phrase, 'manual', trx)
    }
  }

  /**
   * Remembers a correction made in the preview.
   */
  async learn(
    entityType: AliasEntityType,
    entityId: number,
    phrase: string,
    trx: TransactionClientContract
  ) {
    const normalized = normalize(phrase)
    if (normalized.length < 2) return
    await this.upsert(entityType, entityId, normalized, 'learned', trx)
  }

  async removeFor(entityType: AliasEntityType, entityId: number, trx: TransactionClientContract) {
    await CaptureAlias.query({ client: trx }).where({ entityType, entityId }).delete()
  }

  async manualPhrases(entityType: AliasEntityType, entityId: number): Promise<string[]> {
    const aliases = await CaptureAlias.query()
      .where({ entityType, entityId, origin: 'manual' })
      .orderBy('phrase')
    return aliases.map((alias) => alias.phrase)
  }

  /**
   * Finds an alias contained as whole words in the normalized text. The
   * longest phrase wins (« carte bleue » over « carte »).
   */
  async findInText(entityType: AliasEntityType, text: string): Promise<AliasMatch | null> {
    if (text === '') return null
    const row = await db
      .from('capture_aliases')
      .select('entity_id', 'phrase')
      .where('entity_type', entityType)
      .whereRaw(`? ~ ('(^| )' || phrase || '( |$)')`, [text])
      .orderByRaw('length(phrase) desc')
      .first()
    return row ? { entityId: Number(row.entity_id), phrase: String(row.phrase) } : null
  }

  private async upsert(
    entityType: AliasEntityType,
    entityId: number,
    phrase: string,
    origin: 'manual' | 'learned',
    trx: TransactionClientContract
  ) {
    await CaptureAlias.updateOrCreate(
      { entityType, phrase },
      { entityType, phrase, entityId, origin },
      { client: trx }
    )
  }
}
