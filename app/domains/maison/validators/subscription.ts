import vine from '@vinejs/vine'
import { FREQUENCIES } from '#shared/types/maison'

export const subscriptionValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  priceCents: vine.number().withoutDecimals().min(1).max(100_000_000),
  frequency: vine.enum(FREQUENCIES),
  billingDay: vine.number().withoutDecimals().min(1).max(31),
  billingMonth: vine.number().withoutDecimals().min(1).max(12).nullable(),
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .nullable(),
  accountId: vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).nullable(),
  isActive: vine.boolean().optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
