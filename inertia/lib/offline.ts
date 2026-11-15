import { useEffect, useState, useSyncExternalStore } from 'react'
import { router } from '@inertiajs/react'
import { urlFor } from '~/client'
import { sendAction } from '~/lib/http'
import { enqueue, settled, withoutAdd, type OfflineAction } from '#shared/offline_queue'

const KEY = 'paper.offline.queue'
const listeners = new Set<() => void>()
let cached: OfflineAction[] | null = null

function load(): OfflineAction[] {
  if (cached) return cached
  try {
    const raw = window.localStorage.getItem(KEY)
    cached = raw ? (JSON.parse(raw) as OfflineAction[]) : []
  } catch {
    cached = []
  }
  return cached
}

function save(queue: OfflineAction[]) {
  cached = queue
  try {
    if (queue.length === 0) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, JSON.stringify(queue))
  } catch {
    // Storage refused (private window): the queue lives until the tab closes.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const EMPTY: OfflineAction[] = []

/** The actions waiting for the network, kept up to date. */
export function useOfflineQueue(): OfflineAction[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY)
}

export function queueAction(action: OfflineAction) {
  save(enqueue(load(), action))
}

export function cancelAdd(key: string) {
  save(withoutAdd(load(), key))
}

/** Whether the device has a network, followed live. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/** True while the device is offline, so an action must be queued. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

let flushing = false

/**
 * Sends the queued actions, in order, and stops at the first that cannot
 * go through yet (still no network, signed out). The shopping list is
 * then reloaded from the server.
 */
export async function flushQueue() {
  if (flushing || isOffline()) return
  flushing = true
  let sent = 0
  try {
    for (const action of load()) {
      const result =
        action.kind === 'shopping.check'
          ? await sendAction('PATCH', urlFor('shopping.toggle', { id: action.itemId }), {
              checked: action.checked,
            })
          : await sendAction('POST', urlFor('shopping.store'), { label: action.label })
      if (!settled(result.status, result.type)) break
      save(load().filter((queued) => queued !== action))
      sent++
    }
  } catch {
    // Network gone again: what is left waits for the next « online ».
  } finally {
    flushing = false
  }
  if (sent > 0) router.reload()
}

/**
 * Sends the queue when the network comes back, and once at start.
 */
export function useQueueFlush() {
  useEffect(() => {
    flushQueue()
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [])
}
