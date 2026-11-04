/**
 * Free feeds with short articles readable in full (checked by hand,
 * November 2026): sciences, economy and technology only.
 */
export type SourceSuggestion = { name: string; url: string; section: string }

/** Bump when DEFAULT_SOURCES changes: previous defaults are replaced. */
export const DEFAULTS_VERSION = 2

/** Installed on the first visit to the newspaper. */
export const DEFAULT_SOURCES: SourceSuggestion[] = [
  {
    name: '20 Minutes Sciences',
    url: 'https://www.20minutes.fr/feeds/rss-sciences.xml',
    section: 'Sciences',
  },
  { name: 'Science & Vie', url: 'https://www.science-et-vie.com/feed', section: 'Sciences' },
  { name: 'franceinfo Éco', url: 'https://www.francetvinfo.fr/economie.rss', section: 'Économie' },
  {
    name: '20 Minutes Économie',
    url: 'https://www.20minutes.fr/feeds/rss-economie.xml',
    section: 'Économie',
  },
  {
    name: '20 Minutes High-tech',
    url: 'https://www.20minutes.fr/feeds/rss-high-tech.xml',
    section: 'Technologie',
  },
  { name: '01net', url: 'https://www.01net.com/actualites/feed/', section: 'Technologie' },
]

/**
 * Defaults of earlier versions, removed when the list is updated (only
 * these: sources added by hand are never touched).
 */
export const PREVIOUS_DEFAULT_URLS = [
  'https://www.lemonde.fr/rss/une.xml',
  'https://www.france24.com/fr/rss',
  'https://services.lesechos.fr/rss/les-echos-economie.xml',
  'https://www.sciencesetavenir.fr/rss.xml',
  'https://reporterre.net/spip.php?page=backend',
  'https://www.numerama.com/feed/',
  'https://www.telerama.fr/rss/une.xml',
  'https://dwh.lequipe.fr/api/edito/rss?path=/',
]

/** Offered in one click on the sources page: free, readable in full. */
export const SUGGESTED_SOURCES: SourceSuggestion[] = [
  ...DEFAULT_SOURCES,
  {
    name: 'Sciences et Avenir',
    url: 'https://www.sciencesetavenir.fr/rss.xml',
    section: 'Sciences',
  },
  { name: 'CNRS Le journal', url: 'https://lejournal.cnrs.fr/rss', section: 'Sciences' },
  { name: 'BFM Éco', url: 'https://www.bfmtv.com/rss/economie/', section: 'Économie' },
  { name: 'Presse-citron', url: 'https://www.presse-citron.net/feed/', section: 'Technologie' },
  { name: 'Numerama', url: 'https://www.numerama.com/feed/', section: 'Technologie' },
  { name: 'Frandroid', url: 'https://www.frandroid.com/feed', section: 'Technologie' },
]

/** Rubriques in newspaper order; unknown ones follow, alphabetically. */
export const SECTION_ORDER = [
  'À la une',
  'Local',
  'Sciences',
  'Économie',
  'Technologie',
  'Monde',
  'Planète',
  'Santé',
  'Culture',
  'Sport',
]
