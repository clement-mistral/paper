import vine from '@vinejs/vine'
import { ASSET_CLASSES, OPERATION_KINDS } from '#shared/types/budget'
import { MARKET_SYMBOL } from '#domains/budget/market/yahoo'
import { decimal, euros } from '#validators/rules'

/**
 * An operation typed on an account's fiche: on an existing line, or on a
 * new one named by its symbol (quoted) or its name (fonds euros…).
 */
export const operationValidator = vine.create({
  holdingId: vine.number().withoutDecimals().optional(),
  symbol: vine.string().trim().toUpperCase().regex(MARKET_SYMBOL).optional(),
  name: vine.string().trim().maxLength(120).optional(),
  assetClass: vine.enum(ASSET_CLASSES).optional(),
  kind: vine.enum(OPERATION_KINDS),
  occurredOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: decimal().optional(),
  unitPrice: decimal().optional(),
  fees: euros().optional(),
  amount: euros().optional(),
})

export const holdingValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  assetClass: vine.enum(ASSET_CLASSES),
  manualPrice: decimal().optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
