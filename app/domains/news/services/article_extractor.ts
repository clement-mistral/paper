import { decodeEntities, plain } from '#domains/news/services/feed_parser'

/**
 * The full text of an article page, without a dependency. Pure: tested on
 * fixtures. Never bypasses a paywall: an article marked as not free keeps
 * only what the page shows publicly, and says so.
 */

export type ArticleText = {
  /** Paragraphs, plain text. */
  paragraphs: string[]
  /** `isAccessibleForFree: false` in the page's schema.org data. */
  restricted: boolean
}

const MIN_PARAGRAPH = 40
/** A block longer than this (an articleBody without line breaks) is split. */
const LONG_PARAGRAPH = 700
const TARGET_PARAGRAPH = 420

/**
 * Splits a wall of text on sentence ends into paragraphs of about
 * `TARGET_PARAGRAPH` characters.
 */
export function splitLong(text: string): string[] {
  if (text.length <= LONG_PARAGRAPH) return [text]
  const sentences = text.match(/[^.!?…]+[.!?…]+(?:["»”)\s]+|$)|[^.!?…]+$/g) ?? [text]
  const paragraphs: string[] = []
  let current = ''
  for (const sentence of sentences) {
    current += sentence
    if (current.length >= TARGET_PARAGRAPH) {
      paragraphs.push(current.trim())
      current = ''
    }
  }
  if (current.trim()) {
    if (current.trim().length < MIN_PARAGRAPH && paragraphs.length > 0) {
      paragraphs[paragraphs.length - 1] += ` ${current.trim()}`
    } else paragraphs.push(current.trim())
  }
  return paragraphs
}

const ARTICLE_TYPES = new Set([
  'Article',
  'NewsArticle',
  'BlogPosting',
  'ReportageNewsArticle',
  'AnalysisNewsArticle',
  'ScholarlyArticle',
  'TechArticle',
])

function nodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    return [node, ...nodes(node['@graph'])]
  }
  return []
}

function isArticle(node: Record<string, unknown>): boolean {
  const type = node['@type']
  const types = Array.isArray(type) ? type : [type]
  return types.some((value) => typeof value === 'string' && ARTICLE_TYPES.has(value))
}

/**
 * Plain paragraphs from an HTML fragment: `<p>` blocks when there are
 * some, otherwise the text split on blank lines.
 */
export function paragraphsOf(html: string): string[] {
  const blocks = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(([, inner]) => inner)
  const source = blocks.length > 0 ? blocks : html.split(/\n\s*\n|<br\s*\/?>\s*<br\s*\/?>/i)
  return source
    .map((block) => plain(block))
    .filter((text): text is string => text !== null && text.length >= MIN_PARAGRAPH)
    .flatMap(splitLong)
}

/**
 * The article of a page: schema.org `articleBody` first, the paragraphs of
 * its `<article>` element otherwise.
 */
export function extractArticle(html: string): ArticleText | null {
  let restricted = false
  for (const [, body] of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    let parsed: unknown
    try {
      parsed = JSON.parse(body.trim())
    } catch {
      continue
    }
    for (const node of nodes(parsed).filter(isArticle)) {
      if (node.isAccessibleForFree === false || node.isAccessibleForFree === 'False') {
        restricted = true
      }
      if (typeof node.articleBody === 'string') {
        const paragraphs = paragraphsOf(decodeEntities(node.articleBody).replace(/\n/g, '\n\n'))
        if (paragraphs.length > 0) return { paragraphs, restricted }
      }
    }
  }

  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1]
  if (!article) return null
  const cleaned = article.replace(
    /<(script|style|figure|figcaption|aside|nav|footer|form|button)\b[\s\S]*?<\/\1>/gi,
    ' '
  )
  const paragraphs = paragraphsOf(cleaned)
  return paragraphs.length > 0 ? { paragraphs, restricted } : null
}
