import { isIP } from 'node:net'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import PushSubscription from '#domains/notifications/models/push_subscription'
import { sendPush, vapidPublicKey, type PushOptions } from '#domains/notifications/web_push'
import { isPrivateAddress } from '#support/safe_fetch'
import type { PushDevice, PushMessage } from '#shared/types/notifications'

export type SubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/**
 * Public service of the Notifications module: the devices that accepted
 * notifications and sending to all of them. Subscriptions the push
 * service reports as gone (404/410) are removed.
 */
export default class PushService {
  get configured(): boolean {
    return Boolean(env.get('VAPID_PRIVATE_KEY')?.release())
  }

  publicKey(): string | null {
    const privateKey = env.get('VAPID_PRIVATE_KEY')?.release()
    return privateKey ? vapidPublicKey(privateKey) : null
  }

  /**
   * A person's devices: each device belongs to whoever enabled
   * notifications on it.
   */
  async devices(userId: number): Promise<PushDevice[]> {
    const rows = await PushSubscription.query().where('user_id', userId).orderBy('created_at')
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      createdAt: row.createdAt.toISO()!,
    }))
  }

  /**
   * Idempotent: subscribing the same browser again updates its keys.
   */
  async subscribe(userId: number, input: SubscriptionInput, userAgent: string | undefined) {
    // Push services are public: never make the server post to its own network.
    const host = new URL(input.endpoint).hostname.replace(/^\[|\]$/g, '')
    if (host === 'localhost' || (isIP(host) && isPrivateAddress(host))) {
      throw new Exception('Service de notification invalide', { status: 422 })
    }
    await PushSubscription.updateOrCreate(
      { endpoint: input.endpoint },
      { userId, p256Dh: input.keys.p256dh, auth: input.keys.auth, label: deviceLabel(userAgent) }
    )
  }

  async unsubscribe(endpoint: string) {
    await PushSubscription.query().where('endpoint', endpoint).delete()
  }

  async remove(userId: number, id: number) {
    await PushSubscription.query().where({ id, userId }).delete()
  }

  /**
   * Sends to every device of a person. Returns how many accepted it.
   */
  async sendToUser(
    userId: number,
    message: PushMessage,
    options: PushOptions = {}
  ): Promise<number> {
    const privateKey = env.get('VAPID_PRIVATE_KEY')?.release()
    if (!privateKey) return 0
    const vapid = { privateKey, subject: env.get('VAPID_SUBJECT') || env.get('APP_URL') }

    const subscriptions = await PushSubscription.query().where('user_id', userId)
    const payload = JSON.stringify(message)
    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          const status = await sendPush(
            {
              endpoint: subscription.endpoint,
              p256dh: subscription.p256Dh,
              auth: subscription.auth,
            },
            payload,
            vapid,
            { topic: message.tag, ...options }
          )
          if (status === 404 || status === 410) {
            await subscription.delete()
            return false
          }
          if (status >= 400) {
            logger.warn({ status, device: subscription.label }, 'push refused')
            return false
          }
          return true
        } catch (error) {
          logger.warn({ err: error, device: subscription.label }, 'push failed')
          return false
        }
      })
    )
    return results.filter(Boolean).length
  }
}

/**
 * A readable name for the device list: « iPhone · Safari ».
 */
export function deviceLabel(userAgent: string | undefined): string {
  const ua = userAgent ?? ''
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux|X11/.test(ua)
              ? 'Linux'
              : 'Appareil'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : null
  return browser ? `${device} · ${browser}` : device
}
