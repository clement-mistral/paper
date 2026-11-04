/**
 * Rules shared by the fiche forms of every domain.
 */

import vine from '@vinejs/vine'
import { parseEuros } from '#support/money'

/**
 * A French amount typed by the user (« 1 200,50 »), converted to cents.
 */
export function euros() {
  return vine
    .string()
    .trim()
    .regex(/^-?[\d\s\u00a0\u202f]+([.,]\d{1,2})?\s*€?$/)
    .transform((value) => parseEuros(value) ?? 0)
}

/**
 * A decimal typed in French (« 1,5 »), converted to a number.
 */
export function decimal() {
  return vine
    .string()
    .trim()
    .regex(/^\d+([.,]\d+)?$/)
    .transform((value) => Number(value.replace(',', '.')))
}
