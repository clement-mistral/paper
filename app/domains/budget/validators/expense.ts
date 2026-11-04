import vine from '@vinejs/vine'

/**
 * Validates an expense before it is written, whatever produced it
 * (universal capture, form…).
 */
export const expenseValidator = vine.create({
  amountCents: vine.number().withoutDecimals().min(1).max(100_000_000),
  label: vine.string().trim().minLength(1).maxLength(160),
  occurredOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .nullable(),
  accountId: vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).nullable(),
})
