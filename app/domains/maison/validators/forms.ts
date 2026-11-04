import vine from '@vinejs/vine'
import { FREQUENCIES } from '#shared/types/maison'
import { euros } from '#validators/rules'

/**
 * Fiche forms: amounts are typed in euros, ids come from selects.
 */
const envelopeId = () =>
  vine.number().withoutDecimals().exists({ table: 'envelopes', column: 'id' }).optional()
const accountId = () =>
  vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).optional()

export const subscriptionFormValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  price: euros(),
  frequency: vine.enum(FREQUENCIES),
  billingDay: vine.number().withoutDecimals().min(1).max(31),
  billingMonth: vine.number().withoutDecimals().min(1).max(12).optional(),
  envelopeId: envelopeId(),
  accountId: accountId(),
  isActive: vine.boolean().optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const billFormValidator = vine.create({
  provider: vine.string().trim().minLength(1).maxLength(80),
  amount: euros(),
  dueOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  envelopeId: envelopeId(),
  accountId: accountId(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
