import vine from '@vinejs/vine'

export const searchValidator = vine.create({
  q: vine.string().trim().maxLength(100),
})
