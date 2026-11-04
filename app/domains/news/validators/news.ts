import vine from '@vinejs/vine'

const section = () => vine.string().trim().minLength(1).maxLength(40)

export const newsSourceValidator = vine.create({
  url: vine
    .string()
    .trim()
    .url({ require_protocol: true, protocols: ['http', 'https'] }),
  name: vine.string().trim().maxLength(80).optional(),
  section: section(),
})

export const newsSourceUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  section: section(),
  isActive: vine.boolean().optional(),
})

export const newsPicksValidator = vine.create({
  itemIds: vine.array(vine.number().withoutDecimals()).maxLength(60).optional(),
})

export const newspaperSettingsValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(80),
  city: vine.string().trim().maxLength(80).optional(),
  perSection: vine.number().withoutDecimals().min(0).max(10),
})
