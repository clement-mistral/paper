import db from '@adonisjs/lucid/services/db'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { normalize } from '#capture/normalizer'
import { formatAmount, formatDate } from '#support/format'
import { fromIsoDate } from '#support/dates'
import type { Domain } from '#shared/types/domain'
import type { SearchResponse, SearchResult } from '#shared/types/search'

/** Shorter queries return nothing (too many matches to be useful). */
const MIN_LENGTH = 2
/** Below this trigram score, a name is not a match. */
const MIN_SCORE = 0.5
/** Matches kept per kind of fiche, and in all. */
const PER_SOURCE = 4
const TOTAL = 12

type Row = Record<string, unknown> & { id: number; score: number }

/**
 * A searchable table: the columns its text is made of, and how to show a
 * match. Table and column names are constants of this file, never input.
 */
type Source = {
  group: string
  table: string
  /** SQL text expression searched (columns joined by spaces). */
  text: string
  columns: string[]
  where?: string
  orderBy?: string
  title: (row: Row) => string
  detail?: (row: Row) => string | null
  href: (row: Row) => string
  domain: (row: Row) => Domain | null
}

const str = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null)
const isoDate = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return str(value)?.slice(0, 10) ?? null
}
const date = (value: unknown) => {
  const iso = isoDate(value)
  return iso ? formatDate(fromIsoDate(iso)) : null
}
const joined = (...parts: Array<string | null>) => parts.filter(Boolean).join(' · ') || null
const fixed = (domain: Domain | null) => (): Domain | null => domain

const SOURCES: Source[] = [
  {
    group: 'Recettes',
    table: 'recipes',
    text: 'name',
    columns: ['name', 'is_draft'],
    title: (row) => String(row.name),
    detail: (row) => (row.is_draft ? 'brouillon' : null),
    href: (row) => urlFor('recipes.show', { id: row.id }),
    domain: fixed('menu'),
  },
  {
    group: 'Véhicules',
    table: 'vehicles',
    text: "concat_ws(' ', name, plate)",
    columns: ['name', 'plate'],
    title: (row) => String(row.name),
    detail: (row) => str(row.plate),
    href: (row) => urlFor('vehicles.show', { id: row.id }),
    domain: fixed('auto'),
  },
  {
    group: 'Logements',
    table: 'homes',
    text: "concat_ws(' ', name, address)",
    columns: ['name', 'address'],
    title: (row) => String(row.name),
    detail: (row) => str(row.address),
    href: (row) => urlFor('homes.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Équipements',
    table: 'equipment',
    text: "concat_ws(' ', name, brand, model, room)",
    columns: ['name', 'brand', 'model', 'room'],
    title: (row) => String(row.name),
    detail: (row) =>
      joined([str(row.brand), str(row.model)].filter(Boolean).join(' ') || null, str(row.room)),
    href: (row) => urlFor('equipment.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Contrats',
    table: 'contracts',
    text: "concat_ws(' ', name, provider, contract_number, customer_number)",
    columns: ['name', 'provider', 'domain', 'ended_on'],
    title: (row) => String(row.name),
    detail: (row) => joined(str(row.provider), row.ended_on ? 'terminé' : null),
    href: (row) => urlFor('contracts.show', { id: row.id }),
    domain: (row) => (str(row.domain) as Domain | null) ?? 'maison',
  },
  {
    group: 'Abonnements',
    table: 'subscriptions',
    text: 'name',
    columns: ['name', 'price_cents', 'is_active'],
    title: (row) => String(row.name),
    detail: (row) => joined(formatAmount(Number(row.price_cents)), row.is_active ? null : 'arrêté'),
    href: (row) => urlFor('subscriptions.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Factures',
    table: 'bills',
    text: 'provider',
    columns: ['provider', 'amount_cents', 'due_on', 'paid_on'],
    orderBy: 'due_on desc',
    title: (row) => `Facture ${String(row.provider)}`,
    detail: (row) =>
      joined(
        formatAmount(Number(row.amount_cents)),
        row.paid_on ? `payée le ${date(row.paid_on)}` : `échéance le ${date(row.due_on)}`
      ),
    href: (row) => urlFor('bills.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Travaux',
    table: 'projects',
    text: "concat_ws(' ', title, room)",
    columns: ['title', 'room'],
    title: (row) => String(row.title),
    detail: (row) => str(row.room),
    href: (row) => urlFor('projects.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Sinistres',
    table: 'claims',
    text: "concat_ws(' ', title, claim_number)",
    columns: ['title', 'occurred_on'],
    title: (row) => String(row.title),
    detail: (row) => date(row.occurred_on),
    href: (row) => urlFor('claims.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Compteurs',
    table: 'meters',
    text: "concat_ws(' ', label, number)",
    columns: ['label', 'number'],
    title: (row) => String(row.label),
    detail: (row) => str(row.number),
    href: (row) => urlFor('meters.show', { id: row.id }),
    domain: fixed('maison'),
  },
  {
    group: 'Comptes',
    table: 'accounts',
    text: "concat_ws(' ', name, institution)",
    columns: ['name', 'institution'],
    title: (row) => String(row.name),
    detail: (row) => str(row.institution),
    href: (row) => urlFor('accounts.show', { id: row.id }),
    domain: fixed('budget'),
  },
  {
    group: 'Enveloppes',
    table: 'envelopes',
    text: 'name',
    columns: ['name'],
    title: (row) => String(row.name),
    href: (row) => urlFor('envelopes.show', { id: row.id }),
    domain: fixed('budget'),
  },
  {
    group: 'Placements',
    table: 'holdings',
    text: "concat_ws(' ', name, symbol)",
    columns: ['name', 'symbol'],
    title: (row) => String(row.name),
    detail: (row) => str(row.symbol),
    href: (row) => urlFor('portfolios.holdings.show', { id: row.id }),
    domain: fixed('budget'),
  },
  {
    group: 'Tâches',
    table: 'tasks',
    text: "concat_ws(' ', title, room)",
    columns: ['title', 'due_on', 'domain'],
    where: 'done_at is null and cancelled_at is null',
    title: (row) => String(row.title),
    detail: (row) => (row.due_on ? `pour le ${date(row.due_on)}` : null),
    href: (row) => urlFor('tasks.show', { id: row.id }),
    domain: (row) => str(row.domain) as Domain | null,
  },
  {
    group: 'Dépenses et entrées',
    table: 'transactions',
    text: 'label',
    columns: ['label', 'amount_cents', 'occurred_on', 'account_id', 'envelope_id', 'domain'],
    orderBy: 'occurred_on desc',
    title: (row) => String(row.label),
    detail: (row) => joined(formatAmount(Number(row.amount_cents)), date(row.occurred_on)),
    href: (row) =>
      row.account_id
        ? urlFor('accounts.show', { id: Number(row.account_id) })
        : row.envelope_id
          ? urlFor('envelopes.show', { id: Number(row.envelope_id) })
          : urlFor('money'),
    domain: (row) => (str(row.domain) as Domain | null) ?? 'budget',
  },
]

/**
 * Read model of the global search: names and labels of every fiche,
 * matched without accents and with typos (pg_trgm). Read only.
 */
export default class SearchView {
  async search(query: string): Promise<SearchResponse> {
    const text = normalize(query)
    if (text.length < MIN_LENGTH) return { query, results: [] }

    const matches = await Promise.all(SOURCES.map((source) => this.match(source, text)))
    const results = matches
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, TOTAL)
      .map(({ score: _score, ...result }) => result)
    return { query, results }
  }

  /**
   * A word of the name starting like the query scores 1; otherwise the
   * trigram similarity of the query to the closest part of the name.
   */
  private async match(
    source: Source,
    text: string
  ): Promise<Array<SearchResult & { score: number }>> {
    const searched = `unaccent(lower(${source.text}))`
    const score = `greatest(word_similarity(?, ${searched}), case when ${searched} ~ ? then 1 else 0 end)`
    const startsAWord = `(^|[^a-z0-9])${text.replace(/ /g, '[^a-z0-9]+')}`
    const query = db
      .from(source.table)
      .select('id', ...source.columns)
      .select(db.raw(`${score} as score`, [text, startsAWord]))
      .whereRaw(`${score} >= ?`, [text, startsAWord, MIN_SCORE])
      .orderBy('score', 'desc')
      .limit(PER_SOURCE)
    if (source.where) query.whereRaw(source.where)
    if (source.orderBy) query.orderByRaw(source.orderBy)

    const rows = (await query) as Row[]
    return rows.map((row) => ({
      key: `${source.table}:${row.id}`,
      group: source.group,
      title: source.title(row),
      detail: source.detail?.(row) ?? null,
      href: source.href(row),
      domain: source.domain(row),
      score: Number(row.score),
    }))
  }
}
