import vine from '@vinejs/vine'
import { MEAL_OUTCOMES } from '#shared/types/menu'
import { euros } from '#validators/rules'

export const reviewExpenseValidator = vine.create({
  text: vine.string().trim().minLength(1).maxLength(200),
})

export const reviewMealValidator = vine.create({
  outcome: vine.enum(MEAL_OUTCOMES),
  amount: euros().optional(),
})

export const reviewJournalValidator = vine.create({
  mood: vine.number().withoutDecimals().min(1).max(5).nullable().optional(),
  note: vine.string().trim().maxLength(5000).nullable().optional(),
})

export const reviewTaskValidator = vine.create({
  action: vine.enum(['done', 'tomorrow', 'later', 'cancel'] as const),
})

export const habitValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
})
