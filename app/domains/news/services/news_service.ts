import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { errors } from '@vinejs/vine'
import { Exception } from '@adonisjs/core/exceptions'
import NewsItem from '#domains/news/models/news_item'
import NewsPick from '#domains/news/models/news_pick'
import NewsSource from '#domains/news/models/news_source'
import NewspaperSetting from '#domains/news/models/newspaper_setting'
import { parseSigns } from '#domains/news/horoscope'
import { cleanSummary, parseFeed, type ParsedFeed } from '#domains/news/services/feed_parser'
import {
  DEFAULT_SOURCES,
  DEFAULTS_VERSION,
  PREVIOUS_DEFAULT_URLS,
  SECTION_ORDER,
  SUGGESTED_SOURCES,
  type SourceSuggestion,
} from '#domains/news/default_sources'
import { extractArticle } from '#domains/news/services/article_extractor'
import { fetchPublicText, SAFE_FETCH_CODE } from '#support/safe_fetch'
import { HOME_ZONE, fromIsoDate, toIsoDate, today } from '#support/dates'
import type {
  EditionItem,
  NewsChoice,
  NewsItemRow,
  NewsSourceRow,
  NewspaperSettings,
} from '#shared/types/news'
import { SCHOOL_ZONES } from '#shared/types/news'

/** Articles not picked are forgotten after this many days. */
export const KEEP_DAYS = 7
/** Picks (and the articles they hold) are kept this long. */
export const KEEP_PICKS_DAYS = 60
/**
 * Live blogs, videos and podcasts: a stream of short updates or no text
 * at all. Offered on the choice screen, never pre-checked nor printed in
 * full.
 */
export function isLiveOrMedia(title: string): boolean {
  return /^(?:en\s+)?direct\b|^live\b|^vid[ée]o\b|^podcast\b|^replay\b/i.test(title.trim())
}

/** Articles offered per rubrique on the choice screen. */
const OFFERED_PER_SECTION = 15

const FEED_ACCEPT =
  'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'

/**
 * Public service of the News module: the feeds the household follows, the
 * articles fetched from them, and the articles picked for each day's
 * sheet. Deterministic: titles and summaries are the publisher's own.
 */
export default class NewsService {
  async sources(): Promise<NewsSourceRow[]> {
    const sources = await NewsSource.query()
      .withCount('items', (query) => query.as('item_count'))
      .orderBy('section')
      .orderBy('name')
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      section: source.section,
      isActive: source.isActive,
      lastFetchedAt: source.lastFetchedAt?.toISO() ?? null,
      lastError: source.lastError,
      itemCount: Number(source.$extras.item_count ?? 0),
    }))
  }

  /**
   * Adds a feed after reading it once: an address that is not a feed is
   * refused on the field. The name defaults to the feed's own title.
   */
  async addSource(input: { url: string; name?: string | null; section: string }) {
    const existing = await NewsSource.findBy('url', input.url)
    if (existing) this.fieldError('url', 'Cette source est déjà suivie')
    let read: { feed: ParsedFeed; url: string }
    try {
      read = await this.read(input.url)
    } catch (error) {
      if (error instanceof Exception && error.code === SAFE_FETCH_CODE) {
        this.fieldError('url', error.message)
      }
      throw error
    }
    const { feed, url } = read
    if (feed.entries.length === 0) {
      this.fieldError('url', 'Aucun article lisible : est-ce bien un flux RSS ou Atom ?')
    }
    const source = await NewsSource.create({
      name: input.name || feed.title || new URL(url).hostname,
      url: input.url,
      section: input.section,
      isActive: true,
    })
    await this.store(source, feed)
    return source
  }

  /**
   * Installs the default sources, once per version of the list: a removed
   * default is never added back, and when the list changes the previous
   * defaults are replaced (sources added by hand are left alone). True
   * when sources were just installed.
   */
  async installDefaults(): Promise<boolean> {
    const row = (await NewspaperSetting.query().orderBy('id').first()) ?? new NewspaperSetting()
    const installed = row.$isPersisted
      ? Math.max(row.defaultsVersion, row.defaultsInstalled ? 1 : 0)
      : 0
    if (installed >= DEFAULTS_VERSION) return false
    if (installed > 0) {
      const current = new Set(DEFAULT_SOURCES.map(({ url }) => url))
      await NewsSource.query()
        .whereIn(
          'url',
          PREVIOUS_DEFAULT_URLS.filter((url) => !current.has(url))
        )
        .delete()
    }
    for (const source of DEFAULT_SOURCES) {
      await db.rawQuery(
        `insert into news_sources (name, url, section, is_active, created_at, updated_at)
         values (?, ?, ?, true, now(), now()) on conflict (url) do nothing`,
        [source.name, source.url, source.section]
      )
    }
    row.merge({ defaultsInstalled: true, defaultsVersion: DEFAULTS_VERSION })
    await row.save()
    return true
  }

  /**
   * Suggested feeds not followed yet.
   */
  async suggestions(): Promise<SourceSuggestion[]> {
    const rows = await NewsSource.query().select('url')
    const followed = new Set(rows.map(({ url }) => url))
    return SUGGESTED_SOURCES.filter((source) => !followed.has(source.url))
  }

  async addSuggestion(url: string) {
    const suggestion = SUGGESTED_SOURCES.find((source) => source.url === url)
    if (!suggestion) throw new Exception('Source inconnue', { status: 404 })
    return this.addSource(suggestion)
  }

  async updateSource(id: number, input: { name: string; section: string; isActive?: boolean }) {
    const source = await NewsSource.findOrFail(id)
    source.merge({ name: input.name, section: input.section, isActive: input.isActive ?? false })
    await source.save()
    return source
  }

  async deleteSource(id: number) {
    const source = await NewsSource.findOrFail(id)
    await source.delete()
  }

  /**
   * Fetches every active feed (one failing never stops the others), then
   * forgets old articles. Run hourly and by « Actualiser ».
   */
  async refreshAll(): Promise<{ fetched: number; failed: number }> {
    const sources = await NewsSource.query().where('is_active', true)
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const { feed } = await this.read(source.url)
          await this.store(source, feed)
          return true
        } catch (error) {
          source.lastError = error instanceof Error ? error.message : String(error)
          source.lastFetchedAt = DateTime.now()
          await source.save()
          logger.warn({ source: source.url, err: error }, 'news feed failed')
          return false
        }
      })
    )
    await this.prune()
    const failed = results.filter((ok) => !ok).length
    return { fetched: sources.length - failed, failed }
  }

  async prune() {
    const cutoff = DateTime.now().minus({ days: KEEP_DAYS }).toSQL()!
    await NewsPick.query()
      .where('day', '<', toIsoDate(today().minus({ days: KEEP_PICKS_DAYS })))
      .delete()
    await NewsItem.query()
      .where('published_at', '<', cutoff)
      .whereNotExists((query) =>
        query.from('news_picks').whereColumn('news_picks.item_id', 'news_items.id')
      )
      .delete()
  }

  /**
   * The articles offered for a day (published the day before or that
   * day), by rubrique, and the current choice: the saved one, or the
   * most recent `perSection` of each rubrique not already printed in the
   * previous day's sheet (so tomorrow's paper can be prepared tonight).
   */
  async choice(day: string): Promise<NewsChoice> {
    const start = fromIsoDate(day).minus({ days: 1 })
    const end = fromIsoDate(day).endOf('day')
    const [items, picks, settings, previousPicks] = await Promise.all([
      NewsItem.query()
        .preload('source')
        .whereHas('source', (query) => query.where('is_active', true))
        .whereBetween('published_at', [start.toUTC().toSQL()!, end.toUTC().toSQL()!])
        .orderBy('published_at', 'desc'),
      NewsPick.query().where('day', day).orderBy('position'),
      this.settings(),
      NewsPick.query().where('day', toIsoDate(start)),
    ])
    /** Articles in the previous day's sheet: not pre-checked again. */
    const alreadyPrinted = new Set(previousPicks.map((pick) => pick.itemId))

    const sections = this.bySection(
      items.map((item) => this.toRow(item)),
      OFFERED_PER_SECTION
    )
    const saved = picks.length > 0
    const pickedIds = saved
      ? picks.map((pick) => pick.itemId)
      : sections.flatMap((section) =>
          section.items
            .filter((item) => !isLiveOrMedia(item.title) && !alreadyPrinted.has(item.id))
            .slice(0, settings.perSection)
            .map(({ id }) => id)
        )
    return { day, sections, pickedIds, saved }
  }

  async savePicks(day: string, itemIds: number[]) {
    await db.transaction(async (trx) => {
      await NewsPick.query({ client: trx }).where('day', day).delete()
      const known = await NewsItem.query({ client: trx }).whereIn('id', itemIds).select('id')
      const ids = new Set(known.map(({ id }) => id))
      let position = 0
      for (const itemId of itemIds) {
        if (!ids.has(itemId)) continue
        await NewsPick.create(
          { day: fromIsoDate(day), itemId, position: position++ },
          { client: trx }
        )
      }
    })
  }

  /**
   * The articles of a day's sheet, by rubrique, in the order picked, with
   * their full text (fetched now when missing).
   */
  async edition(day: string): Promise<Array<{ name: string; items: EditionItem[] }>> {
    const choice = await this.choice(day)
    const items = await NewsItem.query().preload('source').whereIn('id', choice.pickedIds)
    await this.ensureBodies(items)
    const byId = new Map(items.map((item) => [item.id, item]))
    const picked = choice.pickedIds
      .map((id) => byId.get(id))
      .filter((item): item is NewsItem => item !== undefined)
      .map((item): EditionItem => ({
        ...this.toRow(item),
        paragraphs: item.body ? item.body.split('\n\n') : null,
        restricted: item.restricted,
      }))
    return this.bySection(picked, Infinity, false)
  }

  /**
   * Fetches the full text of articles that do not have it yet, in
   * parallel, once each: a page that cannot be read keeps the summary.
   */
  async ensureBodies(items: NewsItem[]) {
    const missing = items.filter((item) => item.bodyFetchedAt === null && item.link)
    await Promise.all(
      missing.map(async (item) => {
        try {
          const { text } = await fetchPublicText(item.link!, {
            accept: 'text/html',
            maxBytes: 5_000_000,
            timeoutMs: 8000,
          })
          const article = extractArticle(text)
          item.body = article ? article.paragraphs.join('\n\n') : null
          item.restricted = article?.restricted ?? false
        } catch (error) {
          logger.warn({ link: item.link, err: error }, 'article text unavailable')
          item.body = null
        }
        item.bodyFetchedAt = DateTime.now()
        await item.save()
      })
    )
  }

  async settings(): Promise<NewspaperSettings> {
    const row = await NewspaperSetting.query().orderBy('id').first()
    return {
      title: row?.title ?? 'Le journal du foyer',
      city: row?.city ?? null,
      latitude: row?.latitude === null || row?.latitude === undefined ? null : Number(row.latitude),
      longitude:
        row?.longitude === null || row?.longitude === undefined ? null : Number(row.longitude),
      perSection: row?.perSection ?? 2,
      horoscopeSigns: parseSigns(row?.horoscopeSigns),
      schoolZone: SCHOOL_ZONES.find((zone) => zone === row?.schoolZone) ?? null,
    }
  }

  async saveSettings({ horoscopeSigns, ...input }: NewspaperSettings) {
    const row = (await NewspaperSetting.query().orderBy('id').first()) ?? new NewspaperSetting()
    row.merge({ ...input, horoscopeSigns: parseSigns(horoscopeSigns.join(',')).join(',') })
    await row.save()
  }

  private async read(address: string): Promise<{ feed: ParsedFeed; url: string }> {
    const { text, url } = await fetchPublicText(address, {
      accept: FEED_ACCEPT,
      maxBytes: 5_000_000,
    })
    return { feed: parseFeed(text), url }
  }

  /**
   * Inserts the new articles of a feed; known ones (same guid) are left
   * as they are. Articles without a date are dated now.
   */
  private async store(source: NewsSource, feed: ParsedFeed) {
    const now = new Date()
    for (const entry of feed.entries) {
      await db.rawQuery(
        `insert into news_items (source_id, guid, title, summary, link, published_at, created_at, updated_at)
         values (?, ?, ?, nullif(?, ''), nullif(?, ''), ?, now(), now())
         on conflict (source_id, guid) do nothing`,
        [
          source.id,
          entry.guid,
          entry.title,
          entry.summary ?? '',
          entry.link ?? '',
          (entry.publishedAt && entry.publishedAt <= now ? entry.publishedAt : now).toISOString(),
        ]
      )
    }
    source.lastFetchedAt = DateTime.now()
    source.lastError = null
    await source.save()
  }

  private bySection<T extends NewsItemRow>(items: T[], limit: number, sortNewest = true) {
    const sections = new Map<string, T[]>()
    for (const item of items) {
      const list = sections.get(item.section) ?? []
      if (list.length < limit) list.push(item)
      sections.set(item.section, list)
    }
    const rank = (name: string) => {
      const index = SECTION_ORDER.indexOf(name)
      return index === -1 ? SECTION_ORDER.length : index
    }
    return [...sections.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'fr'))
      .map(([name, list]) => ({
        name,
        items: sortNewest ? list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) : list,
      }))
  }

  private toRow(item: NewsItem): NewsItemRow {
    return {
      id: item.id,
      title: item.title,
      summary: cleanSummary(item.summary),
      link: item.link,
      publishedAt: item.publishedAt.setZone(HOME_ZONE).toISO()!,
      source: item.source.name,
      section: item.source.section,
    }
  }

  private fieldError(field: string, message: string): never {
    throw new errors.E_VALIDATION_ERROR([{ field, message, rule: 'news' }])
  }
}
