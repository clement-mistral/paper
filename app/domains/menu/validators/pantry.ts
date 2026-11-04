import vine from '@vinejs/vine'
import { MEAL_SLOTS, PANTRY_LOCATIONS, UNITS } from '#shared/types/menu'
import { decimal } from '#validators/rules'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const pantryValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  location: vine.enum(PANTRY_LOCATIONS),
  quantity: decimal().optional(),
  unit: vine.enum(UNITS).optional(),
  expiresOn: isoDate().optional(),
})

export const pantryUpdateValidator = vine.create({
  quantity: decimal().optional(),
  expiresOn: isoDate().optional(),
  location: vine.enum(PANTRY_LOCATIONS).optional(),
})

export const planSuggestionValidator = vine.create({
  plannedOn: isoDate(),
  slot: vine.enum(MEAL_SLOTS),
  servings: vine.number().withoutDecimals().min(1).max(50),
})

export const recipeImportValidator = vine.create({
  url: vine
    .string()
    .trim()
    .url({ require_protocol: true, protocols: ['http', 'https'] }),
})

export const substitutionValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  note: vine.string().trim().maxLength(120).optional(),
})
