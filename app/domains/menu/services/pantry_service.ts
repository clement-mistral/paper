import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import PantryItem from '#domains/menu/models/pantry_item'
import PantryMovement from '#domains/menu/models/pantry_movement'
import IngredientService from '#domains/menu/services/ingredient_service'
import { convert } from '#domains/menu/services/units'
import mealSuggestionsConfig from '#config/meal_suggestions'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type { PantryLocation, PantryRow, Unit } from '#shared/types/menu'

export type PantryInput = {
  name: string
  location: PantryLocation
  quantity?: number | null
  unit?: Unit | null
  expiresOn?: string | null
}

export type StockLine = { ingredientId: number; quantity: number | null; unit: Unit | null }

/** Where something is taken from first: what spoils first. */
const LOCATION_ORDER: Record<PantryLocation, number> = { fridge: 0, cupboard: 1, freezer: 2 }

const round = (value: number) => Math.round(value * 100) / 100

/**
 * One line per ingredient: a recipe may list the same one twice.
 * Quantities add up in the unit of the first line when they convert.
 */
export function mergeLines(lines: StockLine[]): StockLine[] {
  const merged = new Map<number, StockLine>()
  for (const line of lines) {
    const current = merged.get(line.ingredientId)
    if (!current) {
      merged.set(line.ingredientId, { ...line })
      continue
    }
    if (current.quantity === null || line.quantity === null) {
      current.quantity = current.quantity ?? line.quantity
      continue
    }
    const added = convert(line.quantity, line.unit, current.unit)
    if (added !== null) current.quantity = round(current.quantity + added)
  }
  return [...merged.values()]
}

/**
 * Public service of the Menu domain for the stock (frigo, placards,
 * congélateur). Every automatic change is a movement tied to its source
 * (a cooked meal, a checked shopping item): applying the same source twice
 * does nothing, and it can be reverted.
 */
@inject()
export default class PantryService {
  constructor(private ingredients: IngredientService) {}

  async list(): Promise<PantryRow[]> {
    const items = await PantryItem.query().preload('ingredient')
    return items
      .map((item) => this.toRow(item))
      .sort(
        (a, b) =>
          LOCATION_ORDER[a.location] - LOCATION_ORDER[b.location] ||
          (a.expiresOn ?? '9999').localeCompare(b.expiresOn ?? '9999') ||
          a.name.localeCompare(b.name, 'fr')
      )
  }

  /**
   * What is available, per ingredient, expired items left out.
   */
  async availability(): Promise<
    Map<number, Array<{ quantity: number | null; unit: Unit | null; expiresOn: string | null }>>
  > {
    const items = await PantryItem.query()
    const day = toIsoDate(today())
    const byIngredient = new Map<
      number,
      Array<{ quantity: number | null; unit: Unit | null; expiresOn: string | null }>
    >()
    for (const item of items) {
      const expiresOn = item.expiresOn ? toIsoDate(item.expiresOn) : null
      if (expiresOn && expiresOn < day) continue
      if (item.quantity !== null && item.quantity <= 0) continue
      const list = byIngredient.get(item.ingredientId) ?? []
      list.push({ quantity: item.quantity, unit: item.unit, expiresOn })
      byIngredient.set(item.ingredientId, list)
    }
    return byIngredient
  }

  /**
   * Adds to the stock by hand. An ingredient already stored at the same
   * place adds up (when the units convert), otherwise it is replaced.
   */
  async add(input: PantryInput): Promise<PantryItem> {
    return db.transaction(async (trx) => {
      const ingredient = await this.ingredients.findOrCreate(input.name, trx)
      const existing = await PantryItem.query({ client: trx })
        .where({ ingredientId: ingredient.id, location: input.location })
        .forUpdate()
        .first()
      const quantity = input.quantity ?? null
      const unit = input.unit ?? (quantity !== null ? ingredient.defaultUnit : null)
      const expiresOn = input.expiresOn ? fromIsoDate(input.expiresOn) : null

      if (existing) {
        const added =
          quantity !== null && existing.quantity !== null
            ? convert(quantity, unit, existing.unit)
            : null
        if (added !== null) existing.quantity = round(existing.quantity! + added)
        else existing.merge({ quantity, unit })
        if (expiresOn) existing.expiresOn = expiresOn
        await existing.save()
        return existing
      }
      return PantryItem.create(
        { ingredientId: ingredient.id, location: input.location, quantity, unit, expiresOn },
        { client: trx }
      )
    })
  }

  async update(
    id: number,
    input: { quantity?: number | null; expiresOn?: string | null; location?: PantryLocation }
  ) {
    const item = await PantryItem.findOrFail(id)
    if (input.quantity !== undefined) item.quantity = input.quantity
    if (input.expiresOn !== undefined) {
      item.expiresOn = input.expiresOn ? fromIsoDate(input.expiresOn) : null
    }
    if (input.location) item.location = input.location
    if (item.quantity !== null && item.quantity <= 0) {
      await item.delete()
      return
    }
    await item.save()
  }

  async remove(id: number) {
    const item = await PantryItem.findOrFail(id)
    await item.delete()
  }

  /**
   * Takes what a cooked meal used, from what spoils first. Idempotent.
   */
  async consume(
    source: { type: string; id: number },
    needs: StockLine[],
    trx: TransactionClientContract
  ) {
    if (await this.applied(source, trx)) return
    for (const need of mergeLines(needs)) {
      if (need.quantity === null || need.quantity <= 0) continue
      const rows = await PantryItem.query({ client: trx })
        .where('ingredient_id', need.ingredientId)
        .whereNotNull('quantity')
        .forUpdate()
      rows.sort(
        (a, b) =>
          (a.expiresOn?.toMillis() ?? Infinity) - (b.expiresOn?.toMillis() ?? Infinity) ||
          LOCATION_ORDER[a.location] - LOCATION_ORDER[b.location]
      )
      let remaining = need.quantity
      for (const row of rows) {
        if (remaining <= 0) break
        const wanted = convert(remaining, need.unit, row.unit)
        if (wanted === null) continue
        const taken = Math.min(row.quantity!, wanted)
        if (taken <= 0) continue
        await this.move(row.ingredientId, row.location, -taken, row.unit, source, trx)
        remaining -= convert(taken, row.unit, need.unit) ?? remaining
      }
    }
  }

  /**
   * Puts bought items in the stock, where the ingredient is usually kept
   * (the cupboards otherwise). Idempotent.
   */
  async stock(
    source: { type: string; id: number },
    lines: StockLine[],
    trx: TransactionClientContract
  ) {
    if (await this.applied(source, trx)) return
    for (const line of mergeLines(lines)) {
      const existing = await PantryItem.query({ client: trx })
        .where('ingredient_id', line.ingredientId)
        .orderBy('id')
        .forUpdate()
        .first()
      const location = existing?.location ?? 'cupboard'
      if (existing && existing.quantity === null) {
        // Already « il y en a »: nothing to add, but remember the source.
        await this.record(line.ingredientId, location, 0, existing.unit, source, trx)
        continue
      }
      if (line.quantity === null) {
        if (!existing) {
          await PantryItem.create(
            { ingredientId: line.ingredientId, location, quantity: null, unit: null },
            { client: trx }
          )
        }
        await this.record(line.ingredientId, location, 0, null, source, trx)
        continue
      }
      const unit = existing?.unit ?? line.unit
      const quantity = convert(line.quantity, line.unit, unit) ?? line.quantity
      await this.move(line.ingredientId, location, quantity, unit, source, trx)
    }
  }

  /**
   * Undoes everything a source changed (a meal no longer cooked, a
   * shopping item unchecked).
   */
  async revert(source: { type: string; id: number }, trx: TransactionClientContract) {
    const movements = await PantryMovement.query({ client: trx }).where({
      sourceType: source.type,
      sourceId: source.id,
    })
    for (const movement of movements) {
      if (movement.quantity !== 0) {
        await this.adjust(
          movement.ingredientId,
          movement.location,
          -movement.quantity,
          movement.unit,
          trx
        )
      }
      await movement.useTransaction(trx).delete()
    }
  }

  private async applied(source: { type: string; id: number }, trx: TransactionClientContract) {
    const movement = await PantryMovement.query({ client: trx })
      .where({ sourceType: source.type, sourceId: source.id })
      .first()
    return movement !== null
  }

  private async move(
    ingredientId: number,
    location: PantryLocation,
    quantity: number,
    unit: Unit | null,
    source: { type: string; id: number },
    trx: TransactionClientContract
  ) {
    await this.adjust(ingredientId, location, quantity, unit, trx)
    await this.record(ingredientId, location, quantity, unit, source, trx)
  }

  private async record(
    ingredientId: number,
    location: PantryLocation,
    quantity: number,
    unit: Unit | null,
    source: { type: string; id: number },
    trx: TransactionClientContract
  ) {
    await PantryMovement.create(
      {
        ingredientId,
        location,
        quantity: round(quantity),
        unit,
        sourceType: source.type,
        sourceId: source.id,
      },
      { client: trx }
    )
  }

  /**
   * Adds a signed quantity at a place; a row that reaches zero is removed.
   */
  private async adjust(
    ingredientId: number,
    location: PantryLocation,
    quantity: number,
    unit: Unit | null,
    trx: TransactionClientContract
  ) {
    const row = await PantryItem.query({ client: trx })
      .where({ ingredientId, location })
      .forUpdate()
      .first()
    if (!row) {
      if (quantity > 0) {
        await PantryItem.create(
          { ingredientId, location, quantity: round(quantity), unit },
          { client: trx }
        )
      }
      return
    }
    if (row.quantity === null) return
    const delta = convert(quantity, unit, row.unit) ?? quantity
    const next = round(row.quantity + delta)
    if (next <= 0) {
      await row.useTransaction(trx).delete()
      return
    }
    row.quantity = next
    await row.useTransaction(trx).save()
  }

  private toRow(item: PantryItem): PantryRow {
    const day = today()
    let freshness: PantryRow['freshness'] = 'ok'
    if (item.expiresOn) {
      if (item.expiresOn < day) freshness = 'expired'
      else if (item.expiresOn <= day.plus({ days: mealSuggestionsConfig.expiringDays })) {
        freshness = 'soon'
      }
    }
    return {
      id: item.id,
      ingredientId: item.ingredientId,
      name: item.ingredient.name,
      location: item.location,
      quantity: item.quantity,
      unit: item.unit,
      expiresOn: item.expiresOn ? toIsoDate(item.expiresOn) : null,
      freshness,
    }
  }
}
