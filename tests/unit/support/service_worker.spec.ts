import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

type Handler = (event: FakeEvent) => void
type FakeEvent = {
  request: FakeRequest
  respondWith: (response: Promise<Response> | Response) => void
  waitUntil: (promise: Promise<unknown>) => void
}
type FakeRequest = { url: string; method: string; mode: string; headers: Headers }

const ORIGIN = 'https://paper.test'

/**
 * public/sw.js run in a sandbox: an in-memory Cache Storage and a fetch
 * that answers from a table, or fails like a device without network.
 */
async function serviceWorker() {
  const source = await readFile(new URL('../../../public/sw.js', import.meta.url), 'utf8')
  const stores = new Map<string, Map<string, Response>>()
  const keyOf = (request: string | { url: string }) =>
    typeof request === 'string' ? new URL(request, ORIGIN).href : request.url
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      return {
        async put(request: string | { url: string }, response: Response) {
          store.set(keyOf(request), response)
        },
        async addAll(urls: string[]) {
          for (const url of urls) store.set(keyOf(url), new Response(`shell ${url}`))
        },
      }
    },
    async match(request: string | { url: string }) {
      for (const store of stores.values()) {
        const found = store.get(keyOf(request))
        if (found) return found.clone()
      }
      return undefined
    },
    async delete(name: string) {
      return stores.delete(name)
    },
    async keys() {
      return [...stores.keys()]
    },
  }
  const network = { online: true, answers: new Map<string, () => Response>(), calls: 0 }
  const fetchStub = async (request: FakeRequest) => {
    network.calls++
    if (!network.online) throw new TypeError('Failed to fetch')
    const answer = network.answers.get(request.url)
    const response = answer ? answer() : new Response('not found', { status: 404 })
    Object.defineProperty(response, 'type', { value: 'basic' })
    return response
  }
  const handlers = new Map<string, Handler>()
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    registration: {},
  }
  runInNewContext(source, { self, caches, fetch: fetchStub, URL, Response, Promise, console })
  const installing: Promise<unknown>[] = []
  ;(
    handlers.get('install') as unknown as (event: {
      waitUntil: (p: Promise<unknown>) => void
    }) => void
  )({
    waitUntil: (promise) => installing.push(promise),
  })
  await Promise.all(installing)

  async function dispatch(request: Partial<FakeRequest> & { url: string }) {
    let response: Promise<Response> | Response | undefined
    const waits: Promise<unknown>[] = []
    handlers.get('fetch')!({
      request: {
        method: 'GET',
        mode: 'cors',
        headers: new Headers(),
        ...request,
        url: new URL(request.url, ORIGIN).href,
      },
      respondWith: (value) => (response = value),
      waitUntil: (promise) => waits.push(promise),
    })
    await Promise.all(waits)
    return response === undefined ? undefined : await response
  }

  return { dispatch, network, stores }
}

test.group('Offline | service worker', () => {
  test('a main page is kept and shown again without network', async ({ assert }) => {
    const { dispatch, network } = await serviceWorker()
    network.answers.set(`${ORIGIN}/listes`, () => new Response('<html>Listes</html>'))
    network.answers.set(
      `${ORIGIN}/listes`,
      () => new Response('<html>Listes à jour</html>', { headers: { 'content-type': 'text/html' } })
    )

    const online = await dispatch({ url: '/listes', mode: 'navigate' })
    assert.equal(await online!.text(), '<html>Listes à jour</html>')

    network.online = false
    const offline = await dispatch({ url: '/listes', mode: 'navigate' })
    assert.equal(await offline!.text(), '<html>Listes à jour</html>')

    const notKept = await dispatch({ url: '/argent', mode: 'navigate' })
    assert.equal(await notKept!.text(), 'shell /offline.html')
  })

  test('the Inertia response and the full page are kept apart', async ({ assert }) => {
    const { dispatch, network } = await serviceWorker()
    network.answers.set(`${ORIGIN}/agenda`, () => new Response('{"component":"agenda"}'))
    await dispatch({ url: '/agenda', headers: new Headers({ 'X-Inertia': 'true' }) })

    network.online = false
    const inertia = await dispatch({
      url: '/agenda',
      headers: new Headers({ 'X-Inertia': 'true' }),
    })
    assert.equal(await inertia!.text(), '{"component":"agenda"}')
    const page = await dispatch({ url: '/agenda', mode: 'navigate' })
    assert.equal(await page!.text(), 'shell /offline.html', 'no full page kept yet')
  })

  test('recipes below the section are kept; partial reloads are not', async ({ assert }) => {
    const { dispatch, network } = await serviceWorker()
    network.answers.set(`${ORIGIN}/fiches/recettes/12`, () => new Response('Carbonara'))
    network.answers.set(`${ORIGIN}/listes`, () => new Response('partial'))
    await dispatch({ url: '/fiches/recettes/12', mode: 'navigate' })
    await dispatch({
      url: '/listes',
      headers: new Headers({ 'X-Inertia': 'true', 'X-Inertia-Partial-Data': 'shopping' }),
    })

    network.online = false
    const recipe = await dispatch({ url: '/fiches/recettes/12', mode: 'navigate' })
    assert.equal(await recipe!.text(), 'Carbonara')
    await assert.rejects(() =>
      dispatch({ url: '/listes', headers: new Headers({ 'X-Inertia': 'true' }) })
    )
  })

  test('assets come from the cache; logging out forgets the pages', async ({ assert }) => {
    const { dispatch, network, stores } = await serviceWorker()
    network.answers.set(`${ORIGIN}/assets/app-1234.js`, () => new Response('app'))
    network.answers.set(`${ORIGIN}/`, () => new Response('Aujourd’hui'))
    await dispatch({ url: '/assets/app-1234.js' })
    await dispatch({ url: '/', mode: 'navigate' })
    const calls = network.calls
    const asset = await dispatch({ url: '/assets/app-1234.js' })
    assert.equal(await asset!.text(), 'app')
    assert.equal(network.calls, calls, 'served without the network')

    const logout = await dispatch({ url: '/logout', method: 'POST' })
    assert.isUndefined(logout, 'the request itself goes to the server')
    assert.isFalse(stores.has('paper-pages-v1'))
    assert.isTrue(stores.has('paper-static-v1'))

    assert.isUndefined(await dispatch({ url: '/listes/1/cocher', method: 'PATCH' }))
  })
})
