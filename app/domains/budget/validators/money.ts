import vine from '@vinejs/vine'
import { euros } from '#validators/rules'

/**
 * « Argent » forms: amounts typed in euros, accounts from selects.
 */
const accountId = () => vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' })

export const incomeFormValidator = vine.create({
  label: vine.string().trim().minLength(1).maxLength(160),
  amount: euros(),
  occurredOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: accountId().optional(),
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .optional(),
})

export const transferFormValidator = vine.create({
  fromAccountId: accountId(),
  /** Must differ from the source: checked by `TransactionService.transfer`. */
  toAccountId: accountId(),
  amount: euros(),
  occurredOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: vine.string().trim().maxLength(160).optional(),
})
