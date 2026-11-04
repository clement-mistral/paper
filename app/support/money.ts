/**
 * Parses an amount typed in French (« 1 200,50 », « 4.5 », « 12 ») into
 * cents. Returns `null` when the input is not a valid amount.
 */
export function parseEuros(input: string): number | null {
  const compact = input.replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(compact)) {
    return null
  }
  return Math.round(Number.parseFloat(compact) * 100)
}

/**
 * Cents to an editable French string, without thousands separators
 * (« 120050 » → « 1200,50 »).
 */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
