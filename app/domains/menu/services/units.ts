import type { Unit } from '#shared/types/menu'

/**
 * Units of the same family convert into each other (g ↔ kg, ml ↔ cl ↔ l,
 * spoons as volumes); a piece, a pinch or a slice only matches itself.
 */
const FACTORS: Partial<Record<Unit, { family: 'mass' | 'volume'; factor: number }>> = {
  g: { family: 'mass', factor: 1 },
  kg: { family: 'mass', factor: 1000 },
  ml: { family: 'volume', factor: 1 },
  cl: { family: 'volume', factor: 10 },
  l: { family: 'volume', factor: 1000 },
  cas: { family: 'volume', factor: 15 },
  cac: { family: 'volume', factor: 5 },
}

/**
 * `quantity` expressed in `to`, or null when the units do not convert.
 * A missing unit is a piece.
 */
export function convert(quantity: number, from: Unit | null, to: Unit | null): number | null {
  const source = from ?? 'piece'
  const target = to ?? 'piece'
  if (source === target) return quantity
  const a = FACTORS[source]
  const b = FACTORS[target]
  if (!a || !b || a.family !== b.family) return null
  return (quantity * a.factor) / b.factor
}
