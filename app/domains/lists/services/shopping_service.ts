import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import ShoppingItem from '#domains/lists/models/shopping_item'
import type { Domain } from '#shared/types/domain'
import type { ShoppingItemRow } from '#shared/types/lists'

export type ShoppingItemInput = {
  label: string
  ingredientId?: number | null
  quantity?: number | null
  unit?: string | null
}

/**
 * Public service of the Lists module for the shopping list. Other domains
 * fill it (a planned meal adds its ingredients).
 */
export default class ShoppingService {
  /**
   * Unchecked items first, then the ones checked during the last 24 hours.
   */
  async list(): Promise<ShoppingItemRow[]> {
    const items = await ShoppingItem.query()
      .where((query) =>
        query
          .whereNull('checked_at')
          .orWhere('checked_at', '>', DateTime.now().minus({ hours: 24 }).toSQL()!)
      )
      .orderByRaw('checked_at is not null')
      .orderBy('created_at')
    return items.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      reasonDomain: item.reasonDomain,
      reason: item.reason,
      checked: item.checkedAt !== null,
    }))
  }

  async pendingCount(): Promise<number> {
    const row = await db
      .from('shopping_items')
      .whereNull('checked_at')
      .count('* as total')
      .firstOrFail()
    return Number(row.total)
  }

  async add(items: ShoppingItemInput[], trx: TransactionClientContract): Promise<ShoppingItem[]> {
    const created: ShoppingItem[] = []
    for (const item of items) {
      const row = await ShoppingItem.create(
        {
          label: item.label,
          ingredientId: item.ingredientId ?? null,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
        },
        { client: trx }
      )
      created.push(row)
    }
    return created
  }

  /**
   * Adds items on behalf of another domain. Idempotent: an item already
   * added for the same source and label is skipped.
   */
  async addFromSource(
    items: ShoppingItemInput[],
    source: { type: string; id: number; domain: Domain; reason: string }
  ) {
    for (const item of items) {
      await db.rawQuery(
        `insert into shopping_items
          (label, ingredient_id, quantity, unit, reason_domain, reason, source_type, source_id, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, now(), now())
         on conflict (source_type, source_id, label) where source_type is not null do nothing`,
        [
          item.label,
          item.ingredientId ?? null,
          item.quantity ?? null,
          item.unit ?? null,
          source.domain,
          source.reason,
          source.type,
          source.id,
        ]
      )
    }
  }

  /**
   * Removes what another domain added (a cancelled meal).
   */
  async removeForSource(sourceType: string, sourceId: number, trx: TransactionClientContract) {
    await ShoppingItem.query({ client: trx }).where({ sourceType, sourceId }).delete()
  }

  async removeMany(ids: number[], trx: TransactionClientContract) {
    await ShoppingItem.query({ client: trx }).whereIn('id', ids).delete()
  }

  /**
   * Checks or unchecks an item; `lists:shopping_checked` lets Menu put
   * what was bought in the stock (and take it back when unchecked).
   */
  async toggle(id: number) {
    const item = await ShoppingItem.findOrFail(id)
    item.checkedAt = item.checkedAt ? null : DateTime.now()
    await item.save()
    await emitter.emit('lists:shopping_checked', {
      itemId: item.id,
      label: item.label,
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      checked: item.checkedAt !== null,
    })
  }

  async remove(id: number) {
    const item = await ShoppingItem.findOrFail(id)
    await item.delete()
  }

  async clearChecked() {
    await ShoppingItem.query().whereNotNull('checked_at').delete()
  }
}
