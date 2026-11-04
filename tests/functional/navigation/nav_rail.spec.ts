import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import env from '#start/env'
import User from '#models/user'
import VehicleService from '#domains/auto/services/vehicle_service'

type PageObject = { component: string; url: string; props: Record<string, unknown> }
type SsrModule = { default: (page: PageObject) => Promise<{ head: string[]; body: string }> }

const BASE_URL = `http://${env.get('HOST')}:${env.get('PORT')}`

/**
 * Minimal cookie jar: the session and XSRF cookies survive between
 * requests, like in a browser.
 */
class Browser {
  #cookies = new Map<string, string>()

  async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('cookie', [...this.#cookies].map(([key, value]) => `${key}=${value}`).join('; '))
    const xsrf = this.#cookies.get('XSRF-TOKEN')
    if (xsrf) headers.set('x-xsrf-token', decodeURIComponent(xsrf))

    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: 'manual' })
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';')
      const separator = pair.indexOf('=')
      this.#cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
    return response
  }

  async login(email: string, password: string) {
    await this.request(urlFor('session.create'))
    const response = await this.request(urlFor('session.store'), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password }).toString(),
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

/**
 * SSR is disabled in the app, so the HTML only carries the page object.
 * The page is rendered here through the SSR entry, with the Vite dev server
 * the test environment already runs.
 */
async function render(page: PageObject): Promise<string> {
  const vite = await app.container.make('vite')
  const runner = await vite.createModuleRunner()
  try {
    const ssr = (await runner.import('/inertia/ssr.tsx')) as SsrModule
    const { body } = await ssr.default(page)
    return body
  } finally {
    await runner.close()
  }
}

/**
 * Links of the rail (`aria-current` and `aria-label`), in document order.
 */
function railLinks(html: string): Array<{ label: string; current: boolean }> {
  const rail = html.match(/<aside[\s\S]*?<\/aside>/)
  if (!rail) throw new Error('No navigation rail in the page')
  return [...rail[0].matchAll(/<a\b[^>]*>/g)].map(([tag]) => ({
    label: tag.match(/aria-label="([^"]*)"/)?.[1] ?? '',
    current: tag.includes('aria-current="page"'),
  }))
}

test.group('Navigation | rail', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('marks the section of the current page with aria-current', async ({ assert }) => {
    await User.create({
      fullName: 'Clément Test',
      email: 'rail@paper.local',
      password: 'secret123',
    })
    const vehicles = await app.container.make(VehicleService)
    const vehicle = await vehicles.create({ name: 'Clio', fuel: 'e10' })

    const browser = new Browser()
    await browser.login('rail@paper.local', 'secret123')

    const show = await render(await browser.page(urlFor('vehicles.show', { id: vehicle.id })))
    const links = railLinks(show)
    assert.deepEqual(
      links.filter(({ current }) => current).map(({ label }) => label),
      ['Véhicules']
    )
    assert.includeMembers(
      links.map(({ label }) => label),
      ['Aujourd’hui', 'Agenda', 'Argent', 'Listes', 'Logement', 'Recettes', 'Toutes les fiches']
    )
    assert.match(show, /title="Véhicules"/)
    assert.match(show, />C<\/button>/)

    const today = railLinks(await render(await browser.page(urlFor('today'))))
    assert.deepEqual(
      today.filter(({ current }) => current).map(({ label }) => label),
      ['Aujourd’hui']
    )
  })
})
