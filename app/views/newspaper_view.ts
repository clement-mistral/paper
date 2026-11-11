import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import NewsService, { isLiveOrMedia } from '#domains/news/services/news_service'
import WeatherService from '#domains/news/services/weather_service'
import { quoteOf, saintOf } from '#domains/news/ephemeris'
import { horoscopeOf, sunSignOf } from '#domains/news/horoscope'
import { holidayOf, moonOf } from '#domains/news/calendar'
import { sudokuOf } from '#domains/news/sudoku'
import { crosswordOf } from '#domains/news/crossword'
import MarketService from '#domains/news/services/market_service'
import SchoolHolidaysService from '#domains/news/services/school_holidays_service'
import RecipeService from '#domains/menu/services/recipe_service'
import { inSeason } from '#domains/menu/seasons'
import HomeService from '#domains/maison/services/home_service'
import MeterService from '#domains/maison/services/meter_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RoutineService from '#domains/routine/services/routine_service'
import AgendaView from '#views/agenda_view'
import MoneyView from '#views/money_view'
import { HOME_ZONE, toIsoDate, today } from '#support/dates'
import { formatDate, formatNumber } from '#support/format'
import { shuffled } from '#support/seeded'
import type { EditionItem, FullArticle, Newspaper } from '#shared/types/news'

const SLOT_LABELS = { lunch: 'Midi', dinner: 'Soir' } as const
/** Recipes of the season suggested on the leisure page. */
const SEASON_RECIPES = 3

/**
 * What fits on one A4 page of full texts (three columns of 10.5px text),
 * the room a headline takes, and the smallest worthwhile fragment.
 */
export const PAGE_CHARS = 6400
const HEADLINE_CHARS = 320
const MIN_FRAGMENT = 900
const FULL_TEXT_PAGES = [2, 3]

function host(link: string | null): string | null {
  if (!link) return null
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Paragraphs up to `budget` characters; a first paragraph too long is cut
 * on a sentence end.
 */
function cut(paragraphs: string[], budget: number): string[] {
  const kept: string[] = []
  let used = 0
  for (const paragraph of paragraphs) {
    if (used + paragraph.length <= budget) {
      kept.push(paragraph)
      used += paragraph.length
      continue
    }
    const room = budget - used
    if (room >= 200) {
      const slice = paragraph.slice(0, room)
      const end = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? ')
      )
      kept.push(end > 100 ? slice.slice(0, end + 1) : `${slice.slice(0, slice.lastIndexOf(' '))}…`)
    }
    break
  }
  return kept
}

/**
 * Lays the picked articles out on pages 2 and 3, in the front-page order:
 * each goes whole on the first page with room; one that fits nowhere is
 * cut to the room left on the roomiest page, or stays front-page only.
 */
export function layoutFullText(items: EditionItem[]): {
  pages: Array<{ number: number; articles: FullArticle[] }>
  continuesOn: Map<number, number>
} {
  const pages = FULL_TEXT_PAGES.map((number) => ({
    number,
    used: 0,
    articles: [] as FullArticle[],
  }))
  const continuesOn = new Map<number, number>()
  for (const item of items) {
    if (!item.paragraphs || item.paragraphs.length === 0 || isLiveOrMedia(item.title)) continue
    const length = item.paragraphs.reduce((total, paragraph) => total + paragraph.length, 0)
    const cost = length + HEADLINE_CHARS
    let page = pages.find((candidate) => candidate.used + cost <= PAGE_CHARS)
    let paragraphs = item.paragraphs
    let truncated = false
    if (!page) {
      const roomiest = pages.reduce((best, candidate) =>
        candidate.used < best.used ? candidate : best
      )
      const room = PAGE_CHARS - roomiest.used - HEADLINE_CHARS
      if (room < MIN_FRAGMENT) continue
      page = roomiest
      paragraphs = cut(item.paragraphs, room)
      truncated = true
    }
    const used = paragraphs.reduce((total, paragraph) => total + paragraph.length, 0)
    page.used += used + HEADLINE_CHARS
    page.articles.push({
      id: item.id,
      title: item.title,
      section: item.section,
      source: item.source,
      publishedAt: item.publishedAt,
      paragraphs,
      truncated,
      restricted: item.restricted,
      host: host(item.link),
    })
    continuesOn.set(item.id, page.number)
  }
  return {
    pages: pages
      .filter((page) => page.articles.length > 0)
      .map(({ number, articles }) => ({ number, articles })),
    continuesOn,
  }
}

/**
 * Read model of « Journal du jour »: the picked news, the household's day,
 * the weather, a few figures and the ephemeris, for one A4 sheet. Read only.
 */
@inject()
export default class NewspaperView {
  constructor(
    private news: NewsService,
    private weather: WeatherService,
    private agenda: AgendaView,
    private money: MoneyView,
    private meals: MealPlanService,
    private routine: RoutineService,
    private homes: HomeService,
    private meters: MeterService,
    private school: SchoolHolidaysService,
    private recipes: RecipeService,
    private market: MarketService
  ) {}

  async newspaper(day: string): Promise<Newspaper> {
    const date = DateTime.fromISO(day, { zone: HOME_ZONE }).startOf('day')
    const isToday = day === toIsoDate(today())
    const settings = await this.news.settings()

    const [sections, agenda, overview, meals, status, weather, meters, school, seasonal, markets] =
      await Promise.all([
        this.news.edition(day),
        isToday ? this.agenda.today() : null,
        this.money.overview(),
        this.meals.between(day, day),
        this.routine.status(),
        settings.latitude !== null && settings.longitude !== null
          ? this.weather.forecast(settings.latitude, settings.longitude, day)
          : null,
        this.meterLines(),
        settings.schoolZone ? this.school.on(settings.schoolZone, day) : null,
        this.recipes.inSeason(date.month),
        this.market.markets(settings.marketSymbols, day),
      ])
    const items = agenda ? agenda.today : await this.agenda.items(date, date)
    const layout = layoutFullText(sections.flatMap((section) => section.items))
    const lastText = layout.pages.at(-1)?.number ?? 1

    return {
      day,
      title: settings.title,
      issue: date.ordinal,
      sections: sections.map((section) => ({
        name: section.name,
        items: section.items.map(
          ({ paragraphs: _paragraphs, restricted: _restricted, ...item }) => ({
            ...item,
            continuesOn: layout.continuesOn.get(item.id) ?? null,
          })
        ),
      })),
      pages: layout.pages,
      myDay: {
        items: items
          .filter((item) => item.kind !== 'meal')
          .map((item) => ({
            time: item.time,
            title: item.title,
            detail: item.detail,
            domain: item.domain,
          })),
        overdue: agenda?.overdue.length ?? 0,
        meals: meals.map((meal) => `${SLOT_LABELS[meal.slot]} : ${meal.recipe.name}`),
        streak: status.streak,
      },
      weather: weather && settings.city ? { ...weather, city: settings.city } : null,
      figures: {
        spentCents: overview.spentThisMonthCents,
        budgetLeftCents:
          overview.budgetedThisMonthCents > 0
            ? overview.budgetedThisMonthCents - overview.spentThisMonthCents
            : null,
        incomeCents: overview.incomeThisMonthCents,
        meters,
      },
      ephemeris: {
        saint: saintOf(date),
        dayOfYear: date.ordinal,
        daysLeft: (date.isInLeapYear ? 366 : 365) - date.ordinal,
        week: date.weekNumber,
        quote: quoteOf(date),
        sunSign: sunSignOf(date),
      },
      horoscope: horoscopeOf(date, settings.horoscopeSigns),
      calendar: { moon: moonOf(date), holiday: holidayOf(date), school },
      markets: markets ? { ...markets, page: lastText + 1 } : null,
      leisure: this.leisure(date, markets ? lastText + 1 : lastText, seasonal),
    }
  }

  /**
   * The last page: today's sudoku and crossword, yesterday's solved, and
   * the season.
   * Recipes of equal score come in an order of the day, for variety.
   */
  private leisure(
    date: DateTime,
    lastPage: number,
    seasonal: Array<{ name: string; produce: string[]; score: number }>
  ): Newspaper['leisure'] {
    const sudoku = sudokuOf(date)
    const yesterday = sudokuOf(date.minus({ days: 1 }))
    const crossword = crosswordOf(date)
    const solved = crosswordOf(date.minus({ days: 1 }))
    const clues = (list: typeof crossword.across) =>
      list.map(({ number, clue, answer }) => ({ number, clue, length: answer.length }))
    const recipes = shuffled(seasonal, `${toIsoDate(date)}:season`)
      .sort((left, right) => right.score - left.score)
      .slice(0, SEASON_RECIPES)
      .map(({ name, produce }) => ({ name, produce }))
    return {
      page: lastPage + 1,
      sudoku: { level: sudoku.level, grid: sudoku.puzzle },
      yesterday: {
        level: yesterday.level,
        solution: yesterday.solution,
        givens: yesterday.puzzle.map((digit) => digit !== 0),
      },
      crossword: {
        cols: crossword.cols,
        cells: crossword.letters.map((letter, cell) =>
          letter === null ? null : { number: crossword.numbers[cell] }
        ),
        across: clues(crossword.across),
        down: clues(crossword.down),
      },
      crosswordSolution: { cols: solved.cols, letters: solved.letters },
      season: {
        month: date.setLocale('fr').toFormat('LLLL'),
        ...inSeason(date.month),
        recipes,
      },
    }
  }

  private async meterLines(): Promise<Array<{ label: string; value: string }>> {
    const home = await this.homes.current()
    if (!home) return []
    const meters = await this.meters.forHome(home.id)
    return meters
      .filter((meter) => meter.lastReading)
      .map((meter) => {
        const reading = meter.lastReading!
        const perDay =
          reading.perDay !== null ? ` · ${formatNumber(reading.perDay)} ${meter.unit}/j` : ''
        return {
          label: meter.label,
          value: `${formatNumber(reading.value)} ${meter.unit} (${formatDate(DateTime.fromISO(reading.readOn)).slice(0, 5)})${perDay}`,
        }
      })
  }
}
