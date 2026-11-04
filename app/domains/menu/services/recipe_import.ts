import { Exception } from '@adonisjs/core/exceptions'
import { fetchPublicText, SAFE_FETCH_CODE } from '#support/safe_fetch'
import { normalize } from '#capture/normalizer'
import type { Unit } from '#shared/types/menu'

export type ImportedIngredient = {
  /** The line as published (« 200 g de farine T55 »). */
  line: string
  name: string
  quantity: number | null
  unit: Unit | null
}

export type ImportedRecipe = {
  name: string
  servings: number
  prepMinutes: number | null
  cookMinutes: number | null
  steps: string | null
  ingredients: ImportedIngredient[]
  sourceUrl: string
}

/* ---------------------------------------------------------------------- */
/* Parsing (pure)                                                         */
/* ---------------------------------------------------------------------- */

/** `PT1H15M` → 75. */
export function isoMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return null
  const minutes = Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  return minutes > 0 ? minutes : null
}

const UNIT_WORDS: Array<[RegExp, Unit]> = [
  [/^(kg|kilos?|kilogrammes?)$/, 'kg'],
  [/^(g|gr|grammes?)$/, 'g'],
  [/^(l|litres?)$/, 'l'],
  [/^(cl|centilitres?)$/, 'cl'],
  [/^(ml|millilitres?)$/, 'ml'],
  [/^(c\.?\s?a\.?\s?s\.?|cas|cuilleres?\s+a\s+soupe|cuillere\s+a\s+soupe|c\s+a\s+soupe)$/, 'cas'],
  [/^(c\.?\s?a\.?\s?c\.?|cac|cuilleres?\s+a\s+cafe|cuillere\s+a\s+cafe|c\s+a\s+cafe)$/, 'cac'],
  [/^(pincees?)$/, 'pincee'],
  [/^(tranches?)$/, 'tranche'],
]

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

/**
 * « 200 g de farine », « 2 cuillères à soupe d'huile d'olive », « 3 œufs »,
 * « ½ citron », « sel, poivre » → quantity, unit and ingredient name.
 */
export function parseIngredientLine(raw: string): ImportedIngredient {
  const line = raw.replace(/\s+/g, ' ').trim()
  let rest = line
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let quantity: number | null = null
  const number = rest.match(/^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?\s*([½¼¾⅓⅔])?|^([½¼¾⅓⅔])/)
  if (number) {
    if (number[4]) quantity = FRACTIONS[number[4]]
    else {
      quantity = Number(number[1].replace(',', '.'))
      if (number[2]) quantity = quantity / Number(number[2])
      if (number[3]) quantity += FRACTIONS[number[3]]
    }
    rest = rest.slice(number[0].length).trim()
  }

  let unit: Unit | null = null
  const words = rest.split(' ')
  for (let size = Math.min(4, words.length); size >= 1 && quantity !== null; size--) {
    const candidate = normalize(words.slice(0, size).join(' '))
    const found = UNIT_WORDS.find(([pattern]) => pattern.test(candidate))
    if (found) {
      unit = found[1]
      rest = words.slice(size).join(' ')
      break
    }
  }

  const name = rest
    .replace(/^(de |d'|d’|du |des )/i, '')
    .replace(/,.*$/, '')
    .trim()
  const clean = name.charAt(0).toUpperCase() + name.slice(1)
  return {
    line,
    name: clean || line,
    quantity: quantity === null ? null : Math.round(quantity * 100) / 100,
    unit: quantity !== null && unit === null ? 'piece' : unit,
  }
}

function text(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
}

function steps(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map(text)
      .filter((line) => line.length > 0)
  }
  if (Array.isArray(value)) return value.flatMap(steps)
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    if (node.itemListElement) return steps(node.itemListElement)
    if (node.text) return [text(node.text)]
    if (node.name) return [text(node.name)]
  }
  return []
}

function isRecipe(node: Record<string, unknown>): boolean {
  const type = node['@type']
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
}

/** Every object of a JSON-LD document, `@graph` and arrays unfolded. */
function nodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    return [node, ...nodes(node['@graph'])]
  }
  return []
}

/**
 * The first `schema.org/Recipe` of a page, from its JSON-LD scripts.
 */
export function extractRecipe(html: string, sourceUrl: string): ImportedRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const [, body] of scripts) {
    let parsed: unknown
    try {
      parsed = JSON.parse(body.trim())
    } catch {
      continue
    }
    const recipe = nodes(parsed).find(isRecipe)
    if (!recipe) continue

    const servingsValue = Array.isArray(recipe.recipeYield)
      ? recipe.recipeYield[0]
      : recipe.recipeYield
    const servings = Number(String(servingsValue ?? '').match(/\d+/)?.[0] ?? 4)
    const instructions = steps(recipe.recipeInstructions)
    const lines = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : []

    return {
      name: text(recipe.name) || 'Recette importée',
      servings: servings > 0 && servings < 100 ? servings : 4,
      prepMinutes: isoMinutes(recipe.prepTime),
      cookMinutes: isoMinutes(recipe.cookTime),
      steps:
        instructions.length > 0
          ? instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')
          : null,
      ingredients: lines
        .map((line) => text(line))
        .filter((line) => line.length > 0)
        .map(parseIngredientLine),
      sourceUrl,
    }
  }
  return null
}

/* ---------------------------------------------------------------------- */
/* Fetching                                                               */
/* ---------------------------------------------------------------------- */

export { isPrivateAddress } from '#support/safe_fetch'

/**
 * Downloads a recipe page and reads its `schema.org/Recipe`. Only public
 * http(s) addresses (see `#support/safe_fetch`), 2 MB and 8 seconds at most.
 */
export async function importRecipe(address: string): Promise<ImportedRecipe> {
  const { text: html, url } = await fetchPublicText(address, { accept: 'text/html' })
  const recipe = extractRecipe(html, url)
  if (!recipe) {
    throw new Exception('Aucune recette lisible sur cette page (schema.org/Recipe absent)', {
      status: 422,
      code: SAFE_FETCH_CODE,
    })
  }
  return recipe
}
