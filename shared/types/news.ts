/**
 * « Journal du jour » types shared by the server and the client.
 */

export type NewsSourceRow = {
  id: number
  name: string
  url: string
  section: string
  isActive: boolean
  lastFetchedAt: string | null
  lastError: string | null
  itemCount: number
}

export type NewsItemRow = {
  id: number
  title: string
  summary: string | null
  link: string | null
  publishedAt: string
  source: string
  section: string
}

/** An article of the day's sheet, with its full text when readable. */
export type EditionItem = NewsItemRow & {
  /** Null when the page could not be read: only the summary is printed. */
  paragraphs: string[] | null
  /** Marked as not free by the publisher: the public part only. */
  restricted: boolean
}

/** An article printed in full on page 2 or 3. */
export type FullArticle = {
  id: number
  title: string
  section: string
  source: string
  publishedAt: string
  paragraphs: string[]
  /** Cut to fit the pages: the rest is on the publisher's site. */
  truncated: boolean
  restricted: boolean
  /** Host of the original article, printed for the rest. */
  host: string | null
}

export type NewspaperSettings = {
  title: string
  city: string | null
  latitude: number | null
  longitude: number | null
  perSection: number
}

/** The articles offered for a day, by rubrique, with the current choice. */
export type NewsChoice = {
  day: string
  sections: Array<{ name: string; items: NewsItemRow[] }>
  pickedIds: number[]
  /** False until the day's choice is saved: the pre-selection is shown. */
  saved: boolean
}

export type Weather = {
  /** WMO code, for the icon. */
  code: number
  label: string
  minC: number
  maxC: number
  rainChance: number | null
  sunrise: string | null
  sunset: string | null
}

export type Newspaper = {
  day: string
  title: string
  /** Day of the year, as an issue number. */
  issue: number
  /** Front page: summaries, with the page where each article continues. */
  sections: Array<{ name: string; items: Array<NewsItemRow & { continuesOn: number | null }> }>
  /** Pages 2 and 3: the articles in full, as much as fits. */
  pages: Array<{ number: number; articles: FullArticle[] }>
  myDay: {
    items: Array<{ time: string | null; title: string; detail: string | null; domain: string }>
    overdue: number
    meals: string[]
    streak: number
  }
  weather: (Weather & { city: string }) | null
  figures: {
    spentCents: number
    budgetLeftCents: number | null
    incomeCents: number
    meters: Array<{ label: string; value: string }>
  }
  ephemeris: {
    saint: string
    dayOfYear: number
    daysLeft: number
    week: number
    quote: { text: string; author: string }
  }
}
