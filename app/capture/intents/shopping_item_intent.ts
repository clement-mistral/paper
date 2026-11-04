import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cleanLabel, extractAmount } from '#capture/extractors'
import { pick, read, textField } from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import IngredientService from '#domains/menu/services/ingredient_service'
import ShoppingService, { type ShoppingItemInput } from '#domains/lists/services/shopping_service'
import { formatNumber } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'

const KEYWORDS = ['courses', 'ajoute', 'ajouter', 'acheter', 'racheter', 'liste', 'manque']

/**
 * Phrases around the items (« ajoute … aux courses », « il faut acheter
 * … »), removed before splitting the list.
 */
const FRAME = new RegExp(
  [
    String.raw`\b(?:il\s+faut|il\s+manque|faut|penser\s+[àa])\b`,
    String.raw`\b(?:r?ajoute[rz]?|r?acheter|prendre|plus\s+de)\b`,
    /**
     * No leading `\b`: it never matches before « à ».
     */
    String.raw`(?:^|\s)(?:(?:[àa]\s+la|dans\s+la|sur\s+la|la)\s+liste(?:\s+de\s+courses)?|aux\s+courses|liste\s+de\s+courses|courses\s*:?)(?=\s|$)`,
  ].join('|'),
  'gi'
)

const QUANTITY =
  /^(\d+(?:[.,]\d+)?)\s*(kg|g|grammes?|l|litres?|cl|ml|paquets?|bo[iî]tes?|bouteilles?|pots?|tranches?)?\s+(?:de\s+|d['’]\s*)?(.+)$/i

const UNIT_ALIASES: Record<string, string> = {
  gramme: 'g',
  grammes: 'g',
  litre: 'l',
  litres: 'l',
}

export type ParsedItem = { label: string; quantity: number | null; unit: string | null }

/**
 * Pure extraction step: « ajoute 2 litres de lait, des oeufs et du pain
 * aux courses » → lait (2 l), oeufs, pain.
 */
export function parseShoppingItems(raw: string): ParsedItem[] {
  const list = raw.replace(FRAME, ' ')
  return list
    .split(/,|;|\+|\bet\b|\n/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const match = QUANTITY.exec(part)
      if (!match) return { label: cleanLabel(part), quantity: null, unit: null }
      const unit = match[2]?.toLowerCase() ?? null
      return {
        label: cleanLabel(match[3]),
        quantity: Number.parseFloat(match[1].replace(',', '.')),
        unit: unit ? (UNIT_ALIASES[unit] ?? unit) : null,
      }
    })
    .filter((item) => item.label.length > 0)
}

function describe(item: ParsedItem): string {
  if (item.quantity === null) return item.label
  return `${item.label} (${formatNumber(item.quantity)}${item.unit ? ` ${item.unit}` : ''})`
}

/**
 * « ajoute du lait et des oeufs aux courses », « acheter du pain »,
 * « courses : pâtes, tomates » → items on the shopping list.
 */
@inject()
export default class ShoppingItemIntent implements CaptureIntent {
  info = { name: 'shopping_item', label: 'Courses', domain: 'menu' } as const
  keywords = KEYWORDS

  constructor(
    private ingredients: IngredientService,
    private shopping: ShoppingService
  ) {}

  score(input: NormalizedInput): number {
    let score = 0
    if (matchedKeywords(input, this.keywords).length > 0) score += 0.6
    if (/\bil (?:faut|manque)\b/.test(input.text)) score += 0.2
    /**
     * « courses 54 € » is an expense, not a list.
     */
    if (extractAmount(input.raw)?.explicit) score -= 0.5
    return Math.max(0, Math.min(score, 1))
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    return {
      status: 'ready',
      intent: this.info,
      fields: draft.fields,
      missing: [],
      effects: [
        {
          domain: 'menu',
          title: `Courses : ${draft.items.length} article${draft.items.length > 1 ? 's' : ''} ajouté${draft.items.length > 1 ? 's' : ''}`,
          detail: draft.items.map(describe).join(', '),
        },
      ],
    }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    if (draft.items.length === 0) {
      return { message: 'Rien à ajouter aux courses', created: [] }
    }

    const items: ShoppingItemInput[] = []
    for (const item of draft.items) {
      const ingredient = await this.ingredients.match(normalize(item.label))
      items.push({
        label: ingredient?.name ?? item.label,
        ingredientId: ingredient?.id ?? null,
        quantity: item.quantity,
        unit: item.unit,
      })
    }
    const rows = await this.shopping.add(items, trx)

    const count = items.length
    return {
      message: `${count} article${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} aux courses`,
      created: rows.map((row) => ({ type: 'shopping_item' as const, id: row.id })),
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseShoppingItems(input.raw)
    const list = pick(overrides, 'items', parsed.map(describe).join(', '), read.text)
    const items = list.overridden ? parseShoppingItems(list.value) : parsed

    return {
      items,
      missing: items.length === 0 ? ['Articles'] : [],
      fields: [textField('items', 'Articles', list.value, list.overridden)],
    }
  }
}
