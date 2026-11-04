import vine from '@vinejs/vine'
import { UNITS } from '#shared/types/menu'

export const ingredientValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  defaultUnit: vine.enum(UNITS),
  isStaple: vine.boolean().optional(),
  aliases: vine.string().trim().maxLength(500).optional(),
})
