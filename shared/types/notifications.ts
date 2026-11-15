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

/**
 * Reminders of deadlines: bills, contract notices, maintenances,
 * warranties, the day's tasks.
 */
export type DeadlineReminderSettings = {
  enabled: boolean
  /** Local time `HH:MM` of the daily digest. */
  sendTime: string
  /** First reminder this many days before (then the day before, the day). */
  leadDays: number
  /** A notification 15 minutes before a task that has a time. */
  taskAlerts: boolean
}

export type NotificationsPanel = {
  /** False when the server has no VAPID key: nothing can be sent. */
  configured: boolean
  /** `applicationServerKey` for `pushManager.subscribe`, base64url. */
  publicKey: string | null
  devices: PushDevice[]
  reminders: ReviewReminderSettings
  deadlines: DeadlineReminderSettings
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
