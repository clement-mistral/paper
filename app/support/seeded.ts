/**
 * Deterministic draws for the sheet (horoscope, sudoku…): the same seed
 * always gives the same result, so a day's sheet prints the same twice.
 */

/** FNV-1a: a small stable hash of a string. */
export function hash(value: string): number {
  let result = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 0x01000193)
  }
  return result >>> 0
}

/** mulberry32: a pseudo-random generator in [0, 1) seeded by a string. */
export function seededRandom(seed: string): () => number {
  let state = hash(seed)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** A copy of `items` in an order of its own for `seed` (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], seed: string | (() => number)): T[] {
  const next = typeof seed === 'string' ? seededRandom(seed) : seed
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
