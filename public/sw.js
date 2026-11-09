/*
 * Paper service worker: makes the app installable, shows a friendly page
 * when the household server cannot be reached, and displays the push
 * notifications (bilan du soir). Pages and data are never cached (they
 * are personal and always fresh); only the offline page and the icons are.
 */
const CACHE = 'paper-shell-v1'
const SHELL = ['/offline.html', '/icons/icon-192.png', '/icons/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  // Full page loads: the network, or the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }

  // The shell's own files, from the cache first.
  const url = new URL(request.url)
  if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
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
