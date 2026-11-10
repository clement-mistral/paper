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

/**
 * The twelve signs, in the zodiac order, with their usual dates (the
 * exact day of a change varies by a day from one year to the next).
 * The symbols carry U+FE0E so that they print as text, not as emoji.
 */
export const ZODIAC_SIGNS = [
  { key: 'aries', label: 'Bélier', symbol: '♈︎', from: [3, 21], to: [4, 19] },
  { key: 'taurus', label: 'Taureau', symbol: '♉︎', from: [4, 20], to: [5, 20] },
  { key: 'gemini', label: 'Gémeaux', symbol: '♊︎', from: [5, 21], to: [6, 20] },
  { key: 'cancer', label: 'Cancer', symbol: '♋︎', from: [6, 21], to: [7, 22] },
  { key: 'leo', label: 'Lion', symbol: '♌︎', from: [7, 23], to: [8, 22] },
  { key: 'virgo', label: 'Vierge', symbol: '♍︎', from: [8, 23], to: [9, 22] },
  { key: 'libra', label: 'Balance', symbol: '♎︎', from: [9, 23], to: [10, 22] },
  { key: 'scorpio', label: 'Scorpion', symbol: '♏︎', from: [10, 23], to: [11, 21] },
  { key: 'sagittarius', label: 'Sagittaire', symbol: '♐︎', from: [11, 22], to: [12, 21] },
  { key: 'capricorn', label: 'Capricorne', symbol: '♑︎', from: [12, 22], to: [1, 19] },
  { key: 'aquarius', label: 'Verseau', symbol: '♒︎', from: [1, 20], to: [2, 18] },
  { key: 'pisces', label: 'Poissons', symbol: '♓︎', from: [2, 19], to: [3, 20] },
] as const satisfies ReadonlyArray<{
  key: string
  label: string
  symbol: string
  from: readonly [number, number]
  to: readonly [number, number]
}>

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]['key']

export const ZODIAC_KEYS = ZODIAC_SIGNS.map((sign) => sign.key) as ZodiacSign[]

/** « 23 oct. – 21 nov. » */
export function zodiacDates(sign: (typeof ZODIAC_SIGNS)[number]): string {
  const months = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ]
  const day = ([month, date]: readonly [number, number]) =>
    `${date === 1 ? '1er' : date} ${months[month - 1]}`
  return `${day(sign.from)} – ${day(sign.to)}`
}

export type NewspaperSettings = {
  title: string
  city: string | null
  latitude: number | null
  longitude: number | null
  perSection: number
  /** Signs of the household, printed in the horoscope; none: no horoscope. */
  horoscopeSigns: ZodiacSign[]
  /** Zone of the school holidays; null: not printed. */
  schoolZone: SchoolZone | null
}

export type SudokuLevel = 'Facile' | 'Moyen' | 'Difficile'

/** The Moon of a day. */
export type MoonInfo = {
  /** « Pleine lune », « Premier croissant »… */
  label: string
  /** Time of the principal phase when it falls that day (« 14h52 »). */
  time: string | null
  principal: 'new' | 'first' | 'full' | 'last' | null
  /** ISO dates. */
  nextFull: string
  nextNew: string
}

export type PublicHoliday = {
  name: string
  day: string
  inDays: number
  /** On a Tuesday or a Thursday: a « pont » is possible. */
  bridge: boolean
}

/** School zones of the official calendar (métropole). */
export const SCHOOL_ZONES = ['A', 'B', 'C', 'Corse'] as const
export type SchoolZone = (typeof SCHOOL_ZONES)[number]

export type SchoolHolidays = {
  zone: SchoolZone
  /** The holidays under way that day: last day off, ISO. */
  current: { name: string; lastDay: string } | null
  /** The next ones: first day off, ISO. */
  next: { name: string; firstDay: string; inDays: number } | null
}

/** One sign's horoscope of the day. */
export type HoroscopeEntry = {
  sign: ZodiacSign
  label: string
  symbol: string
  dates: string
  /** The day's climate, then a piece of advice. */
  text: string
  /** A small lucky charm of the day (« un thé bien chaud »). */
  charm: string
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
    /** Sign the Sun is in that day (« Scorpion »). */
    sunSign: string
  }
  /** The household's signs, in the zodiac order; empty when none is set. */
  horoscope: HoroscopeEntry[]
  calendar: {
    moon: MoonInfo
    holiday: { today: string | null; next: PublicHoliday }
    /** Null without a zone, or when the official calendar is unreachable. */
    school: SchoolHolidays | null
  }
  /** Last page: games and the season. */
  leisure: {
    page: number
    sudoku: { level: SudokuLevel; grid: number[] }
    /** Yesterday's grid solved; `givens` marks the digits it gave. */
    yesterday: { level: SudokuLevel; solution: number[]; givens: boolean[] }
    season: {
      month: string
      vegetables: string[]
      fruits: string[]
      /** The household's recipes with produce of the month. */
      recipes: Array<{ name: string; produce: string[] }>
    }
  }
}
