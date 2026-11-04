import vine from '@vinejs/vine'
import { DOMAINS } from '#shared/types/domain'
import { RECURRENCES } from '#shared/types/lists'
import { CLAIM_STATUSES, CONTRACT_CATEGORIES, PROJECT_STATUSES } from '#shared/types/maison'
import { euros } from '#validators/rules'

/**
 * Forms of contracts, home projects, claims and chores.
 */
const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const text = (max: number) => vine.string().trim().maxLength(max).optional()
const notes = () => vine.string().trim().maxLength(2000).optional()

export const contractValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  category: vine.enum(CONTRACT_CATEGORIES),
  domain: vine.enum(DOMAINS),
  provider: text(80),
  customerNumber: text(60),
  contractNumber: text(60),
  contact: text(200),
  startedOn: isoDate().optional(),
  commitmentUntil: isoDate().optional(),
  tacitRenewal: vine.boolean().optional(),
  renewalMonths: vine.number().withoutDecimals().min(1).max(120).optional(),
  noticeDays: vine.number().withoutDecimals().min(0).max(365).optional(),
  endedOn: isoDate().optional(),
  subscriptionId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'subscriptions', column: 'id' })
    .optional(),
  notes: notes(),
})

export const projectValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
  status: vine.enum(PROJECT_STATUSES),
  room: text(80),
  budget: euros().optional(),
  startsOn: isoDate().optional(),
  targetOn: isoDate().optional(),
  doneOn: isoDate().optional(),
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .optional(),
  accountId: vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).optional(),
  notes: notes(),
})

export const projectItemValidator = vine.create({
  label: vine.string().trim().minLength(1).maxLength(200),
})

export const projectExpenseValidator = vine.create({
  label: vine.string().trim().minLength(1).maxLength(120),
  amount: euros(),
  occurredOn: isoDate(),
})

export const claimValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
  occurredOn: isoDate(),
  status: vine.enum(CLAIM_STATUSES),
  contractId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'contracts', column: 'id' })
    .optional(),
  declaredOn: isoDate().optional(),
  claimNumber: text(60),
  damage: euros().optional(),
  deductible: euros().optional(),
  compensation: euros().optional(),
  compensatedOn: isoDate().optional(),
  notes: notes(),
})

export const choreValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(200),
  room: text(80),
  recurrence: vine.enum(RECURRENCES),
  recurrenceInterval: vine.number().withoutDecimals().min(1).max(365).optional(),
  dueOn: isoDate().optional(),
})

export const choreSuggestionValidator = vine.create({
  key: vine.string().trim().maxLength(40),
})
