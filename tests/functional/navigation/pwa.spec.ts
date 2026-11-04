import { test } from '@japa/runner'
import env from '#start/env'

const BASE_URL = `http://${env.get('HOST')}:${env.get('PORT')}`

test.group('PWA', () => {
  test('the manifest, icons, service worker and offline page are served', async ({ assert }) => {
    const manifestResponse = await fetch(`${BASE_URL}/manifest.webmanifest`)
    assert.equal(manifestResponse.status, 200)
    const manifest = (await manifestResponse.json()) as {
      display: string
      start_url: string
      icons: Array<{ src: string; sizes: string; purpose?: string }>
    }
    assert.equal(manifest.display, 'standalone')
    assert.equal(manifest.start_url, '/')
    assert.isTrue(manifest.icons.some((icon) => icon.purpose === 'maskable'))
    assert.isTrue(manifest.icons.some((icon) => icon.sizes === '512x512'))

    for (const path of [
      ...manifest.icons.map((icon) => icon.src),
      '/icons/apple-touch-icon.png',
      '/favicon.ico',
      '/sw.js',
      '/offline.html',
    ]) {
      const response = await fetch(`${BASE_URL}${path}`)
      assert.equal(response.status, 200, path)
    }
  })

  test('every page links the manifest, the favicon and the iOS icon', async ({ assert }) => {
    const response = await fetch(`${BASE_URL}/login`)
    const html = await response.text()
    assert.include(html, '<link rel="manifest" href="/manifest.webmanifest"')
    assert.include(html, 'rel="apple-touch-icon"')
    assert.include(html, '<link rel="icon" href="/favicon.ico"')
  })
})
