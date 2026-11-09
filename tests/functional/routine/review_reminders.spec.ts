import { test } from '@japa/runner'
import { createServer, type IncomingMessage } from 'node:http'
import { type AddressInfo } from 'node:net'
import { createECDH, randomBytes } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { Secret } from '@adonisjs/core/helpers'
import env from '#start/env'
import User from '#models/user'
import PushSubscription from '#domains/notifications/models/push_subscription'
import PushService from '#domains/notifications/services/push_service'
import { generateVapidKeys, toBase64Url } from '#domains/notifications/web_push'
import ReviewReminders from '#domains/routine/services/review_reminders'
import RoutineService from '#domains/routine/services/routine_service'
import { today, toIsoDate } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { NotificationsPanel, PushMessage } from '#shared/types/notifications'

/**
 * A browser subscription: real P-256 key and auth secret.
 */
function browserKeys() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return { p256dh: toBase64Url(ecdh.getPublicKey()), auth: toBase64Url(randomBytes(16)) }
}

async function deviceCount() {
  const rows = await PushSubscription.all()
  return rows.length
}

class FakePush extends PushService {
  sent: PushMessage[] = []
  get configured() {
    return true
  }
  async sendToAll(message: PushMessage) {
    this.sent.push(message)
    return 1
  }
}

test.group('Notifications | devices', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a device subscribes, shows in the profile, then unsubscribes', async ({ assert }) => {
    await User.create({ email: 'push@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('push@paper.local', 'secret123')
    const subscription = { endpoint: 'https://push.example.net/send/abc', keys: browserKeys() }
    const json = (body: unknown) => ({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify(body),
    })
    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await browser.request(urlFor('notifications.subscribe'), {
        ...json(subscription),
        headers: { ...json(subscription).headers, 'user-agent': userAgent },
      })
      assert.equal(response.status, 200)
    }

    const page = await browser.page(urlFor('profile.show'))
    const panel = page.props.notifications as NotificationsPanel
    assert.lengthOf(panel.devices, 1)
    assert.equal(panel.devices[0].label, 'iPhone · Safari')
    assert.deepEqual(panel.reminders, {
      eveningEnabled: true,
      eveningTime: '21:00',
      morningEnabled: true,
    })

    await browser.request(
      urlFor('notifications.unsubscribe'),
      json({ endpoint: subscription.endpoint })
    )
    assert.equal(await deviceCount(), 0)
  })

  test('refuses an endpoint that is not https or not public', async ({ assert }) => {
    await User.create({ email: 'push2@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('push2@paper.local', 'secret123')

    for (const endpoint of [
      'http://push.example.net/x',
      'https://127.0.0.1/x',
      'https://192.168.1.10/x',
      'https://localhost/x',
    ]) {
      const response = await browser.request(urlFor('notifications.subscribe'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ endpoint, keys: browserKeys() }),
      })
      assert.equal(response.status, 422, endpoint)
    }
    assert.equal(await deviceCount(), 0)
  })

  test('saves the reminder settings', async ({ assert }) => {
    await User.create({ email: 'push3@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('push3@paper.local', 'secret123')
    await browser.request(urlFor('profile.show'))

    const response = await browser.submit(
      urlFor('notifications.reminders'),
      { eveningEnabled: 'true', eveningTime: '22:15' },
      'PUT'
    )
    assert.equal(response.status, 302)

    const reminders = await app.container.make(ReviewReminders)
    assert.deepEqual(await reminders.settings(), {
      eveningEnabled: true,
      eveningTime: '22:15',
      morningEnabled: false,
    })
  })
})

test.group('Notifications | sending', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('sends encrypted, signed messages and forgets gone devices', async ({ assert, cleanup }) => {
    const requests: Array<{ url: string; headers: IncomingMessage['headers']; size: number }> = []
    const server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        requests.push({
          url: request.url!,
          headers: request.headers,
          size: Buffer.concat(chunks).length,
        })
        response.statusCode = request.url === '/gone' ? 410 : 201
        response.end()
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo

    const previous = env.get('VAPID_PRIVATE_KEY')
    env.set('VAPID_PRIVATE_KEY', new Secret(generateVapidKeys().privateKey))
    cleanup(() => {
      env.set('VAPID_PRIVATE_KEY', previous)
      server.close()
    })

    for (const path of ['/alive', '/gone']) {
      const keys = browserKeys()
      await PushSubscription.create({
        endpoint: `http://127.0.0.1:${port}${path}`,
        p256Dh: keys.p256dh,
        auth: keys.auth,
        label: 'Test',
      })
    }

    const push = await app.container.make(PushService)
    const delivered = await push.sendToAll(
      { title: 'Bilan du soir', body: 'Test', url: '/bilan', tag: 'bilan' },
      { ttl: 600 }
    )

    assert.equal(delivered, 1)
    assert.lengthOf(requests, 2)
    for (const request of requests) {
      assert.equal(request.headers['content-encoding'], 'aes128gcm')
      assert.match(String(request.headers['authorization']), /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/)
      assert.equal(request.headers['ttl'], '600')
      assert.equal(request.headers['topic'], 'bilan')
      assert.isAbove(request.size, 86)
    }
    const left = await PushSubscription.all()
    assert.deepEqual(
      left.map((row) => new URL(row.endpoint).pathname),
      ['/alive']
    )
  })

  test('the evening reminder is sent once, not after the day is validated', async ({
    assert,
    cleanup,
  }) => {
    const fake = new FakePush()
    app.container.swap(PushService, () => fake)
    cleanup(() => app.container.restore(PushService))
    const reminders = await app.container.make(ReviewReminders)
    const evening = today().set({ hour: 21, minute: 30 })

    assert.isNull(await reminders.run(today().set({ hour: 20 })))
    assert.equal(await reminders.run(evening), 'evening')
    assert.isNull(await reminders.run(evening.plus({ minutes: 5 })))
    assert.lengthOf(fake.sent, 1)
    assert.equal(fake.sent[0].title, 'Bilan du soir')
    assert.equal(fake.sent[0].url, `/bilan/${toIsoDate(today())}`)

    // Next day, review validated in the evening: nothing to remind.
    const routine = await app.container.make(RoutineService)
    await routine.confirmMoney(toIsoDate(today()))
    await routine.complete(toIsoDate(today()))
    assert.isNull(await reminders.run(evening))
    assert.isNull(await reminders.run(today().plus({ days: 1 }).set({ hour: 10, minute: 30 })))
    assert.lengthOf(fake.sent, 1)
  })
})
