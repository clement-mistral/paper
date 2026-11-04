import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import type { EventsList } from '@adonisjs/core/types'
import IngredientService from '#domains/menu/services/ingredient_service'
import PantryService from '#domains/menu/services/pantry_service'
import { UNITS, type Unit } from '#shared/types/menu'

/**
 * `lists:shopping_checked` → Menu: what was bought goes into the stock;
 * unchecking takes it back. Idempotent (one movement per shopping item).
 * An item typed by hand is matched to the catalogue by its label.
 */
@inject()
export default class StockFromShopping {
  constructor(
    private pantry: PantryService,
    private ingredients: IngredientService
  ) {}

  async handle(event: EventsList['lists:shopping_checked']) {
    const source = { type: 'shopping_item', id: event.itemId }
    await db.transaction(async (trx) => {
      if (!event.checked) {
        await this.pantry.revert(source, trx)
        return
      }
      const matched = event.ingredientId ? null : await this.ingredients.match(event.label)
      const ingredientId = event.ingredientId ?? matched?.id ?? null
      if (!ingredientId) return
      const unit = (UNITS as readonly string[]).includes(event.unit ?? '')
        ? (event.unit as Unit)
        : null
      await this.pantry.stock(source, [{ ingredientId, quantity: event.quantity, unit }], trx)
    })
  }
}
