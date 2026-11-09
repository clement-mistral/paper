/**
 * Notifications (Web Push) shared types.
 */

export type PushDevice = { id: number; label: string; createdAt: string }

export type ReviewReminderSettings = {
  eveningEnabled: boolean
  /** Local time `HH:MM`. */
  eveningTime: string
  morningEnabled: boolean
}

export type NotificationsPanel = {
  /** False when the server has no VAPID key: nothing can be sent. */
  configured: boolean
  /** `applicationServerKey` for `pushManager.subscribe`, base64url. */
  publicKey: string | null
  devices: PushDevice[]
  reminders: ReviewReminderSettings
}

/**
 * What the service worker receives in a push message.
 */
export type PushMessage = {
  title: string
  body: string
  /** Page opened on click. */
  url: string
  /** A newer notification with the same tag replaces the previous one. */
  tag: string
}
