import vine from '@vinejs/vine'
import { ACCOUNT_TYPES } from '#shared/types/budget'
import { euros } from '#validators/rules'

/**
 * Create and update share the same fields: a fiche form always submits
 * every property.
 */
export const accountValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  type: vine.enum(ACCOUNT_TYPES),
  institution: vine.string().trim().maxLength(80).optional(),
  openingBalance: euros().optional(),
  isDefault: vine.boolean().optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
