import { urlFor } from '@adonisjs/core/services/url_builder'
import env from '#start/env'

export type PageObject = { component: string; url: string; props: Record<string, unknown> }

const BASE_URL = `http://${env.get('HOST')}:${env.get('PORT')}`

/**
 * Minimal cookie jar: the session, XSRF and remember me cookies survive
 * between requests, like in a browser.
 */
export class Browser {
  cookies = new Map<string, string>()

  async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '))
    const xsrf = this.cookies.get('XSRF-TOKEN')
    if (xsrf) headers.set('x-xsrf-token', decodeURIComponent(xsrf))

    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: 'manual' })
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';')
      const separator = pair.indexOf('=')
      const value = pair.slice(separator + 1)
      if (value === '' || /max-age=0|expires=thu, 01 jan 1970/i.test(cookie)) {
        this.cookies.delete(pair.slice(0, separator))
      } else {
        this.cookies.set(pair.slice(0, separator), value)
      }
    }
    return response
  }

  submit(path: string, body: Record<string, string>, method = 'POST') {
    return this.request(path, {
      method,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    })
  }

  async login(email: string, password: string, remember = false) {
    await this.request(urlFor('session.create'))
    const response = await this.submit(urlFor('session.store'), {
      email,
      password,
      ...(remember ? { remember: 'true' } : {}),
    })
    if (response.status !== 302) throw new Error(`Login failed with ${response.status}`)
  }

  /**
   * The page object Inertia embeds in the HTML of a full visit.
   */
  async page(path: string): Promise<PageObject> {
    const response = await this.request(path)
    const html = await response.text()
    if (response.status !== 200) throw new Error(`GET ${path} answered ${response.status}`)

    const script = html.match(/<script[^>]*data-page[^>]*>([\s\S]*?)<\/script>/)
    if (script) return JSON.parse(script[1]) as PageObject
    const attribute = html.match(/data-page="([^"]*)"/)
    if (!attribute) throw new Error('No Inertia page object in the response')
    return JSON.parse(
      attribute[1]
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
    ) as PageObject
  }
}
