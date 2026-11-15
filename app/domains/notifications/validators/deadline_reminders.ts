import vine from '@vinejs/vine'

export const deadlineRemindersValidator = vine.create({
  enabled: vine.boolean().optional(),
  sendTime: vine.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  leadDays: vine.number().withoutDecimals().range([2, 60]),
  taskAlerts: vine.boolean().optional(),
})
