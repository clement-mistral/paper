import vine from '@vinejs/vine'

export const remindersValidator = vine.create({
  eveningEnabled: vine.boolean().optional(),
  eveningTime: vine.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  morningEnabled: vine.boolean().optional(),
})
