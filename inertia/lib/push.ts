import { urlFor } from '~/client'
import { postJson } from '~/lib/http'

/**
 * Web Push on this device: the browser subscription, then its record on
 * the server (one per device).
 */

export type PushState = 'unsupported' | 'denied' | 'enabled' | 'disabled'

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * iOS only offers Web Push to the app added to the home screen.
 */
export function needsInstall(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !standalone
}

async function registration(): Promise<ServiceWorkerRegistration> {
  // Registered in production by app.tsx; also here so it works in dev.
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const existing = await navigator.serviceWorker.getRegistration()
  return existing ? existing.pushManager.getSubscription() : null
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const subscription = await currentSubscription()
  return subscription && Notification.permission === 'granted' ? 'enabled' : 'disabled'
}

/**
 * Asks for the permission, subscribes this browser and records it. Also
 * re-sends an existing subscription (the server may have lost it).
 */
export async function enablePush(publicKey: string): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled'

  const worker = await registration()
  const key = fromBase64Url(publicKey)
  let subscription = await worker.pushManager.getSubscription()
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    // Subscribed with a previous server key: start over.
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  })

  await postJson(urlFor('notifications.subscribe'), subscription.toJSON())
  return 'enabled'
}

export async function disablePush(): Promise<PushState> {
  const subscription = await currentSubscription()
  if (subscription) {
    await postJson(urlFor('notifications.unsubscribe'), { endpoint: subscription.endpoint })
    await subscription.unsubscribe()
  }
  return 'disabled'
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function sameKey(current: ArrayBuffer | null, key: Uint8Array): boolean {
  if (!current) return false
  const bytes = new Uint8Array(current)
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index])
}
