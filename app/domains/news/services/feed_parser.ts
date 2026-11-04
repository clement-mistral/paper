/**
 * RSS 2.0 and Atom feeds, read without a dependency. Pure: tested on
 * fixtures, never on the network. Titles and summaries are the
 * publisher's own words, only cleaned (tags, entities, whitespace).
 */

export type FeedEntry = {
  guid: string
  title: string
  summary: string | null
  link: string | null
  publishedAt: Date | null
}

export type ParsedFeed = {
  title: string | null
  entries: FeedEntry[]
}

const SUMMARY_MAX = 600

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  agrave: 'à',
  acirc: 'â',
  ccedil: 'ç',
  ocirc: 'ô',
  ucirc: 'û',
  icirc: 'î',
  euro: '€',
}

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return NAMED[entity.toLowerCase()] ?? match
  })
}

/** The content of a tag, CDATA unwrapped, entities still encoded. */
function raw(block: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  const match = pattern.exec(block)
  if (!match) return null
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

/** Plain text: tags removed (after decoding, for double-encoded HTML). */
export function plain(value: string | null): string | null {
  if (value === null) return null
  const decoded = decodeEntities(value)
  const text = decodeEntities(
    decoded
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
  return text === '' ? null : text
}

/**
 * Removes what feed generators append to summaries: WordPress's « The
 * post … appeared first on … », its French « L’article … est apparu en
 * premier sur … », « Lire la suite », a trailing « […] ».
 */
export function cleanSummary(value: string | null): string | null {
  if (value === null) return null
  const cleaned = value
    .replace(/\s*The post\s.+?\sappeared first on\s.+$/is, '')
    .replace(/\s*L[’']article\s.+?\sest apparu en premier sur\s.+$/is, '')
    .replace(/\s*(?:Lire la suite|Continue reading|Read more)\s*(?:…|\.{3}|»|→)?\s*$/i, '')
    .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '…')
    .trim()
  return cleaned === '' ? null : cleaned
}

function truncate(value: string | null): string | null {
  if (value === null || value.length <= SUMMARY_MAX) return value
  const cut = value.slice(0, SUMMARY_MAX)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : SUMMARY_MAX)}…`
}

function date(value: string | null): Date | null {
  if (!value) return null
  const time = Date.parse(value.trim())
  return Number.isNaN(time) ? null : new Date(time)
}

function atomLink(block: string): string | null {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map(([, attributes]) => ({
    rel: /rel=["']([^"']+)["']/i.exec(attributes)?.[1] ?? 'alternate',
    href: /href=["']([^"']+)["']/i.exec(attributes)?.[1] ?? null,
  }))
  return (links.find((link) => link.rel === 'alternate') ?? links[0])?.href ?? null
}

export function parseFeed(xml: string): ParsedFeed {
  const isAtom =
    /<feed\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom["']/i.test(xml) ||
    (/<entry\b/i.test(xml) && !/<item\b/i.test(xml))
  const blocks = [
    ...xml.matchAll(isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi),
  ].map(([block]) => block)
  const firstEntry = xml.search(isAtom ? /<entry\b/i : /<item\b/i)
  const head = firstEntry >= 0 ? xml.slice(0, firstEntry) : xml
  const title = plain(raw(head, 'title'))

  const entries: FeedEntry[] = []
  for (const block of blocks) {
    const entryTitle = plain(raw(block, 'title'))
    if (!entryTitle) continue
    const link = isAtom ? atomLink(block) : plain(raw(block, 'link'))
    const summary = isAtom
      ? (plain(raw(block, 'summary')) ?? plain(raw(block, 'content')))
      : (plain(raw(block, 'description')) ?? plain(raw(block, 'content:encoded')))
    const guid = plain(raw(block, isAtom ? 'id' : 'guid')) ?? link ?? entryTitle
    const publishedAt = isAtom
      ? date(raw(block, 'published') ?? raw(block, 'updated'))
      : date(raw(block, 'pubDate') ?? raw(block, 'dc:date'))
    entries.push({
      guid: guid.slice(0, 500),
      title: entryTitle.slice(0, 300),
      summary: truncate(cleanSummary(summary === entryTitle ? null : summary)),
      link: link ? decodeEntities(link).slice(0, 1000) : null,
      publishedAt,
    })
  }
  return { title, entries }
}
