import vine from '@vinejs/vine'

export const billValidator = vine.create({
  provider: vine.string().trim().minLength(1).maxLength(80),
  amountCents: vine.number().withoutDecimals().min(1).max(100_000_000),
  dueOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .nullable(),
  accountId: vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).nullable(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
