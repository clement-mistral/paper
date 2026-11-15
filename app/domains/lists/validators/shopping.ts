import vine from '@vinejs/vine'

export const shoppingItemValidator = vine.create({
  label: vine.string().trim().minLength(1).maxLength(120),
})

/** `checked` given: set that state (idempotent); missing: toggle. */
export const shoppingCheckValidator = vine.create({
  checked: vine.boolean().optional(),
})
