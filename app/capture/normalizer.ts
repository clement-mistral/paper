import { wordsToDigits } from '#capture/numbers'

/**
 * Input of every capture step: the raw text (for display and extraction,
 * accents and case kept) and its normalized form (for matching).
 */
export type NormalizedInput = {
  /** What the user typed, kept for traceability. */
  original: string
  /** Typed text with spelled numbers converted (« deux litres » → « 2 litres »). */
  raw: string
  text: string
  tokens: string[]
}

/**
 * Lowercase, no accents, apostrophes and punctuation turned into spaces,
 * single spaces. « J'ai payé 4,50 € au Café » → « j ai paye 4 50 au cafe ».
 */
export function normalize(value: string): string {
  return value
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeInput(typed: string): NormalizedInput {
  /**
   * Phones type typographic apostrophes (« aujourd’hui »), which the date
   * parser does not understand.
   */
  const raw = wordsToDigits(typed.trim().replace(/[’‘]/g, "'"))
  const text = normalize(raw)
  return { original: typed.trim(), raw, text, tokens: text === '' ? [] : text.split(' ') }
}

/**
 * Splits a comma or line separated list of phrases typed in a form into
 * unique normalized phrases.
 */
export function normalizePhrases(value: string | undefined | null): string[] {
  if (!value) return []
  const phrases = value
    .split(/[,;\n]/)
    .map(normalize)
    .filter((phrase) => phrase.length > 0)
  return [...new Set(phrases)]
}

/**
 * Normalized singular form of a name, so « Œufs », « oeuf » and « œuf »
 * are the same ingredient. Naive French plural: trailing « s » or « x ».
 */
export function singularKey(value: string): string {
  return normalize(value)
    .split(' ')
    .map((word) => (word.length > 3 && /[sx]$/.test(word) ? word.slice(0, -1) : word))
    .join(' ')
}
