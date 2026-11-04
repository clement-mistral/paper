import vine from '@vinejs/vine'
import { UNITS } from '#shared/types/menu'
import { decimal } from '#validators/rules'

export const recipeValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  servings: vine.number().withoutDecimals().min(1).max(50),
  prepMinutes: vine.number().withoutDecimals().min(0).max(2000).optional(),
  cookMinutes: vine.number().withoutDecimals().min(0).max(2000).optional(),
  steps: vine.string().trim().maxLength(10000).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
  keywords: vine.string().trim().maxLength(500).optional(),
  ingredients: vine
    .array(
      vine.object({
        name: vine.string().trim().maxLength(80),
        quantity: decimal().optional(),
        unit: vine.enum(UNITS).optional(),
        isMain: vine.boolean().optional(),
      })
    )
    .optional(),
})
