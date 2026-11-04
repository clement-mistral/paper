import vine from '@vinejs/vine'

export const shoppingItemValidator = vine.create({
  label: vine.string().trim().minLength(1).maxLength(120),
})
