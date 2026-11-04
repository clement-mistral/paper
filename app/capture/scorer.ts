import type { NormalizedInput } from '#capture/normalizer'

/**
 * Edit distance between two words (Levenshtein).
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }
  return previous[b.length]
}

/**
 * A token matches a keyword exactly, or with one typo for long keywords
 * sharing the first letter (« depnse » → « depense »). Short words are
 * exact only: « ranger » must not read as « manger ».
 */
export function tokenMatches(token: string, keyword: string): boolean {
  if (token === keyword) return true
  if (keyword.length < 7 || token[0] !== keyword[0]) return false
  if (Math.abs(token.length - keyword.length) > 1) return false
  return editDistance(token, keyword) <= 1
}

/**
 * Keywords of the input, as normalized single words.
 */
export function matchedKeywords(input: NormalizedInput, keywords: string[]): string[] {
  return keywords.filter((keyword) => input.tokens.some((token) => tokenMatches(token, keyword)))
}

/**
 * Two intents whose scores are closer than this are considered ambiguous:
 * the user picks, Paper never guesses.
 */
export const AMBIGUITY_MARGIN = 0.15

/**
 * Below this score, an intent is not considered at all.
 */
export const MIN_SCORE = 0.5
