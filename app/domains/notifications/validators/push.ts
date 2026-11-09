import vine from '@vinejs/vine'

const endpoint = () =>
  vine
    .string()
    .url({ protocols: ['https'] })
    .maxLength(2048)

/**
 * `PushSubscription.toJSON()` as sent by the browser.
 */
export const subscribeValidator = vine.create({
  endpoint: endpoint(),
  keys: vine.object({
    p256dh: vine
      .string()
      .regex(/^[A-Za-z0-9_-]+=*$/)
      .maxLength(255),
    auth: vine
      .string()
      .regex(/^[A-Za-z0-9_-]+=*$/)
      .maxLength(255),
  }),
})

export const unsubscribeValidator = vine.create({
  endpoint: endpoint(),
})
