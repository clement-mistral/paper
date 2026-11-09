import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  hkdfSync,
  randomBytes,
  sign,
  type ECDH,
} from 'node:crypto'

/**
 * Web Push without a dependency (node:crypto only):
 * - VAPID authentication (RFC 8292): an ES256 JWT signed with the server key;
 * - payload encryption « aes128gcm » (RFC 8291 over RFC 8188).
 *
 * Keys are base64url: the private key is the raw 32-byte P-256 scalar, the
 * public key the 65-byte uncompressed point (what browsers expect as
 * `applicationServerKey`).
 */

export type VapidKeys = { publicKey: string; privateKey: string }

export type PushTarget = {
  endpoint: string
  /** Browser public key (`keys.p256dh`), base64url. */
  p256dh: string
  /** Browser auth secret (`keys.auth`), base64url. */
  auth: string
}

const RECORD_SIZE = 4096

export function toBase64Url(buffer: Buffer | Uint8Array): string {
  return Buffer.from(buffer).toString('base64url')
}

export function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

export function generateVapidKeys(): VapidKeys {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return {
    publicKey: toBase64Url(ecdh.getPublicKey()),
    privateKey: toBase64Url(padScalar(ecdh.getPrivateKey())),
  }
}

/**
 * The public key is derived from the private one: only the private key
 * has to be configured.
 */
export function vapidPublicKey(privateKey: string): string {
  return toBase64Url(ecdhFrom(privateKey).getPublicKey())
}

/**
 * `Authorization` header value for a push service (`aud` is the origin of
 * the endpoint). Valid 12 hours (the maximum allowed is 24).
 */
export function vapidAuthorization(
  endpoint: string,
  privateKey: string,
  subject: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  const ecdh = ecdhFrom(privateKey)
  const publicKey = ecdh.getPublicKey()
  const header = toBase64Url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = toBase64Url(
    Buffer.from(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: nowSeconds + 12 * 3600, sub: subject })
    )
  )
  const key = createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: privateKey,
      x: toBase64Url(publicKey.subarray(1, 33)),
      y: toBase64Url(publicKey.subarray(33, 65)),
    },
  })
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  })
  return `vapid t=${header}.${claims}.${toBase64Url(signature)}, k=${toBase64Url(publicKey)}`
}

/**
 * Encrypts a payload for one browser subscription (a single record).
 * `salt` and `serverKeys` are only passed by tests (RFC vectors).
 */
export function encryptPayload(
  target: Pick<PushTarget, 'p256dh' | 'auth'>,
  plaintext: Buffer,
  options: { salt?: Buffer; serverKeys?: ECDH } = {}
): Buffer {
  const uaPublic = fromBase64Url(target.p256dh)
  const authSecret = fromBase64Url(target.auth)
  const salt = options.salt ?? randomBytes(16)

  const server = options.serverKeys ?? createECDH('prime256v1')
  if (!options.serverKeys) server.generateKeys()
  const asPublic = server.getPublicKey()
  const sharedSecret = server.computeSecret(uaPublic)

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic])
  const ikm = Buffer.from(hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32))
  const cek = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16)
  )
  const nonce = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12)
  )

  // Last (and only) record: the content then the 0x02 delimiter, no padding.
  if (plaintext.length + 1 + 16 > RECORD_SIZE) {
    throw new Error('Push payload too large')
  }
  const cipher = createCipheriv('aes-128-gcm', cek, nonce)
  const body = Buffer.concat([
    cipher.update(Buffer.concat([plaintext, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ])

  const recordSize = Buffer.alloc(4)
  recordSize.writeUInt32BE(RECORD_SIZE)
  return Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic, body])
}

export type PushOptions = {
  /** Seconds the push service keeps the message for an offline device. */
  ttl?: number
  /** A newer message with the same topic replaces an undelivered one. */
  topic?: string
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
}

/**
 * Sends one push message. Returns the HTTP status of the push service
 * (201 when accepted, 404/410 when the subscription is gone).
 */
export async function sendPush(
  target: PushTarget,
  payload: string,
  vapid: { privateKey: string; subject: string },
  options: PushOptions = {}
): Promise<number> {
  const body = encryptPayload(target, Buffer.from(payload, 'utf8'))
  const headers: Record<string, string> = {
    'Authorization': vapidAuthorization(target.endpoint, vapid.privateKey, vapid.subject),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    'TTL': String(options.ttl ?? 4 * 3600),
    'Urgency': options.urgency ?? 'normal',
  }
  if (options.topic) headers['Topic'] = options.topic

  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers,
    body: new Uint8Array(body),
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  })
  await response.body?.cancel()
  return response.status
}

function ecdhFrom(privateKey: string): ECDH {
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(fromBase64Url(privateKey))
  return ecdh
}

function padScalar(scalar: Buffer): Buffer {
  return scalar.length >= 32 ? scalar : Buffer.concat([Buffer.alloc(32 - scalar.length), scalar])
}
