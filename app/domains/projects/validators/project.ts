import vine from '@vinejs/vine'
import { PROJECT_STATUSES } from '#shared/types/projects'

export const projectCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
})

export const projectUpdateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
  description: vine.string().trim().maxLength(5000).nullable().optional(),
  status: vine.enum(PROJECT_STATUSES),
  /** The form shows the sharing setting: an unchecked box means « not shared ». */
  sharing: vine.boolean().optional(),
  shared: vine.boolean().optional(),
  budget: vine.number().min(0).max(10_000_000).nullable().optional(),
})

export const projectNoteValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(10_000),
})

export const projectTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(200),
})

export const projectLinkValidator = vine.create({
  url: vine
    .string()
    .trim()
    .url({ protocols: ['http', 'https'], require_protocol: true })
    .maxLength(2000),
  title: vine.string().trim().maxLength(200).nullable().optional(),
})

export const projectExpenseValidator = vine.create({
  amount: vine.number().positive().max(10_000_000),
  label: vine.string().trim().minLength(1).maxLength(120),
  occurredOn: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
