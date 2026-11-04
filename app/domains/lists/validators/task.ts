import vine from '@vinejs/vine'
import { DOMAINS } from '#shared/types/domain'
import { RECURRENCES } from '#shared/types/lists'

const fields = {
  title: vine.string().trim().minLength(1).maxLength(200),
  notes: vine.string().trim().maxLength(5000).nullable().optional(),
  dueOn: vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  dueTime: vine
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  domain: vine.enum(DOMAINS).nullable().optional(),
  recurrence: vine.enum(RECURRENCES).nullable().optional(),
  recurrenceInterval: vine.number().withoutDecimals().min(1).max(365).optional(),
  /** Household chores only. */
  room: vine.string().trim().maxLength(80).nullable().optional(),
}

export const taskValidator = vine.create({
  ...fields,
  items: vine.array(vine.string().trim().maxLength(200)).optional(),
})

export const taskFormValidator = vine.create(fields)

export const taskItemValidator = vine.create({
  label: vine.string().trim().minLength(1).maxLength(200),
})
