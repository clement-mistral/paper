/*
 * Paper service worker: makes the app installable, keeps working when the
 * household server cannot be reached, and displays the push
 * notifications.
 *
 * Offline:
 * - the app's own files (`/assets`, hashed by Vite, and the icons) are
 *   served from the cache first;
 * - the main pages (Aujourd'hui, Agenda, Listes, Repas, Recettes) go to
 *   the network first and keep their last version, as a full page and as
 *   an Inertia response, to be shown when offline;
 * - anything else falls back to the offline page.
 * The pages kept are personal: they are dropped at login and logout.
 * Changes made offline are queued by the page itself (shopping list).
 */
const SHELL_CACHE = 'paper-shell-v2'
const STATIC_CACHE = 'paper-static-v1'
const PAGES_CACHE = 'paper-pages-v1'
const CACHES = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE]
const SHELL = ['/offline.html', '/icons/icon-192.png', '/icons/icon.svg']

/** Pages kept for offline use (and the pages below the last one). */
const OFFLINE_PAGES = ['/', '/agenda', '/listes', '/repas']
const OFFLINE_SECTIONS = ['/fiches/recettes']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !CACHES.includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

function keptOffline(url) {
  return (
    OFFLINE_PAGES.includes(url.pathname) ||
    OFFLINE_SECTIONS.some(
      (section) => url.pathname === section || url.pathname.startsWith(`${section}/`)
    )
  )
}

/** An Inertia response and the full page of the same URL are kept apart. */
function pageKey(request, url) {
  if (!request.headers.get('X-Inertia')) return url.href
  const key = new URL(url.href)
  key.searchParams.set('__inertia', '1')
  return key.href
}

async function networkFirst(request, url) {
  const key = pageKey(request, url)
  try {
    const response = await fetch(request)
    const partial = request.headers.get('X-Inertia-Partial-Data')
    if (response.ok && !response.redirected && response.type === 'basic' && !partial) {
      const cache = await caches.open(PAGES_CACHE)
      await cache.put(key, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(key)
    if (cached) return cached
    if (request.mode === 'navigate') return caches.match('/offline.html')
    throw error
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Someone else may use this device next: forget the pages kept.
  if (request.method === 'POST' && (url.pathname === '/login' || url.pathname === '/logout')) {
    event.waitUntil(caches.delete(PAGES_CACHE))
    return
  }
  if (request.method !== 'GET') return

  if (
    url.pathname.startsWith('/assets/') ||
    SHELL.includes(url.pathname) ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  const isPage = request.mode === 'navigate' || request.headers.get('X-Inertia')
  if (isPage && keptOffline(url)) {
    event.respondWith(networkFirst(request, url))
    return
  }

  // Other full page loads: the network, or the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
  }
})

/*
 * Push message: { title, body, url, tag } (shared/types/notifications.ts).
 */
self.addEventListener('push', (event) => {
  let message = { title: 'Paper', body: '', url: '/', tag: 'paper' }
  try {
    message = { ...message, ...event.data.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      renotify: true,
      icon: '/icons/icon-192.png',
      lang: 'fr',
      data: { url: message.url },
    })
  )
})

/*
 * Opens the page of the notification, in an open Paper window if any.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) {
        return open
          .focus()
          .then((client) => client.navigate(url))
          .catch(() => self.clients.openWindow(url))
      }
      return self.clients.openWindow(url)
    })
  )
})
