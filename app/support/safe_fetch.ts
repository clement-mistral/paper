import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * Downloads from the public web on the household's behalf (recipe pages,
 * news feeds). The server must never be made to fetch its own network:
 * private addresses are refused, at every redirect hop.
 */

export const SAFE_FETCH_CODE = 'E_SAFE_FETCH'

/**
 * Loopback, private, link-local, CGNAT (Tailscale) and unique-local
 * addresses.
 */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const lower = address.toLowerCase()
  return (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168.')
  )
}

function refuse(message: string): never {
  throw new Exception(message, { status: 422, code: SAFE_FETCH_CODE })
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') refuse('Adresse invalide')
  const resolved = await lookup(url.hostname, { all: true }).catch(() => [])
  if (resolved.length === 0) refuse('Site introuvable')
  if (resolved.some(({ address }) => isPrivateAddress(address))) {
    refuse('Seuls les sites publics sont accessibles')
  }
}

export type SafeFetchOptions = {
  accept: string
  maxBytes?: number
  timeoutMs?: number
  maxRedirects?: number
}

/**
 * The text of a public page and the address it ended at.
 */
export async function fetchPublicText(
  address: string,
  options: SafeFetchOptions
): Promise<{ text: string; url: string }> {
  const maxBytes = options.maxBytes ?? 2_000_000
  let url: URL
  try {
    url = new URL(address)
  } catch {
    refuse('Adresse invalide')
  }

  let response: Response | null = null
  for (let hop = 0; hop <= (options.maxRedirects ?? 3); hop++) {
    await assertPublic(url)
    response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
      headers: { 'accept': options.accept, 'user-agent': 'Paper (home OS)' },
    }).catch(() => refuse('Le site ne répond pas'))
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url)
      continue
    }
    break
  }
  if (!response || (response.status >= 300 && response.status < 400)) {
    refuse('Trop de redirections')
  }
  if (!response.ok) refuse(`Le site a répondu ${response.status}`)
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes)
    refuse('Page trop volumineuse')
  const text = await response.text()
  if (text.length > maxBytes) refuse('Page trop volumineuse')
  return { text, url: url.toString() }
}
