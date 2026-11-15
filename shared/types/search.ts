import type { Domain } from './domain.js'

/**
 * One match of the global search (Ctrl K), whatever its domain.
 */
export type SearchResult = {
  key: string
  /** The kind of fiche, used as the group heading (« Recettes »). */
  group: string
  title: string
  detail: string | null
  href: string
  domain: Domain | null
}

export type SearchResponse = {
  query: string
  results: SearchResult[]
}
