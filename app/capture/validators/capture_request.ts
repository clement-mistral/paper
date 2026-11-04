import vine from '@vinejs/vine'
import { INTENT_NAMES } from '#shared/types/capture'

const overrides = () =>
  vine
    .record(vine.unionOfTypes([vine.string().maxLength(500), vine.number(), vine.literal(null)]))
    .optional()

export const captureRequestValidator = vine.create({
  text: vine.string().maxLength(500),
  intent: vine.enum(INTENT_NAMES).optional(),
  overrides: overrides(),
  segments: vine
    .array(vine.object({ intent: vine.enum(INTENT_NAMES).optional(), overrides: overrides() }))
    .maxLength(10)
    .optional(),
})
