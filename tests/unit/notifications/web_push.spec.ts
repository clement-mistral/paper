import { test } from '@japa/runner'
import { createECDH, createPublicKey, verify } from 'node:crypto'
import {
  encryptPayload,
  fromBase64Url,
  generateVapidKeys,
  toBase64Url,
  vapidAuthorization,
  vapidPublicKey,
} from '#domains/notifications/web_push'

test.group('Notifications | web push', () => {
  /**
   * RFC 8291, appendix A.
   */
  test('encrypts the RFC 8291 example message', ({ assert }) => {
    const server = createECDH('prime256v1')
    server.setPrivateKey(fromBase64Url('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'))

    const body = encryptPayload(
      {
        p256dh:
          'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
        auth: 'BTBZMqHH6r4Tts7J_aSIgg',
      },
      Buffer.from('When I grow up, I want to be a watermelon'),
      { salt: fromBase64Url('DGv6ra1nlYgDCS1FRnbzlw'), serverKeys: server }
    )

    assert.equal(
      toBase64Url(body),
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'
    )
  })

  test('signs a VAPID token the public key verifies', ({ assert }) => {
    const keys = generateVapidKeys()
    assert.equal(vapidPublicKey(keys.privateKey), keys.publicKey)
    assert.lengthOf(fromBase64Url(keys.publicKey), 65)
    assert.lengthOf(fromBase64Url(keys.privateKey), 32)

    const now = 1_800_000_000
    const header = vapidAuthorization(
      'https://push.example.net/send/abc',
      keys.privateKey,
      'mailto:foyer@example.net',
      now
    )
    const [, token, publicKey] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    assert.equal(publicKey, keys.publicKey)

    const [head, claims, signature] = token.split('.')
    assert.deepEqual(JSON.parse(fromBase64Url(claims).toString()), {
      aud: 'https://push.example.net',
      exp: now + 12 * 3600,
      sub: 'mailto:foyer@example.net',
    })

    const point = fromBase64Url(keys.publicKey)
    const key = createPublicKey({
      format: 'jwk',
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: toBase64Url(point.subarray(1, 33)),
        y: toBase64Url(point.subarray(33)),
      },
    })
    assert.isTrue(
      verify(
        'sha256',
        Buffer.from(`${head}.${claims}`),
        { key, dsaEncoding: 'ieee-p1363' },
        fromBase64Url(signature)
      )
    )
  })
})
