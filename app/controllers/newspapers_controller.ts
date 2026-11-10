import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { Exception } from '@adonisjs/core/exceptions'
import NewsService from '#domains/news/services/news_service'
import WeatherService from '#domains/news/services/weather_service'
import {
  newsPicksValidator,
  newsSourceUpdateValidator,
  newsSourceValidator,
  newspaperSettingsValidator,
} from '#domains/news/validators/news'
import NewspaperView from '#views/newspaper_view'
import { SAFE_FETCH_CODE } from '#support/safe_fetch'
import { toIsoDate, today } from '#support/dates'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'

const suggestionValidator = vine.create({ url: vine.string().trim().maxLength(500) })

/**
 * « Journal du jour » : an A4 sheet of the news the household picked, its
 * day, the weather and the ephemeris, printed or saved as PDF.
 */
@inject()
export default class NewspapersController {
  constructor(
    private news: NewsService,
    private weather: WeatherService,
    private view: NewspaperView
  ) {}

  /**
   * First visit: the default sources are installed and fetched in the
   * background (never during tests: no network there).
   */
  private async firstVisit() {
    const installed = await this.news.installDefaults()
    if (installed && !app.inTest) {
      this.news.refreshAll().catch((error) => logger.error({ err: error }, 'news refresh failed'))
    }
    return installed
  }

  async current({ response }: HttpContext) {
    await this.firstVisit()
    return response.redirect().toRoute('newspapers.show', { day: toIsoDate(today()) })
  }

  /**
   * Tomorrow's sheet, to prepare in the evening and print for the morning.
   */
  async tomorrow({ response }: HttpContext) {
    await this.firstVisit()
    return response
      .redirect()
      .toRoute('newspapers.show', { day: toIsoDate(today().plus({ days: 1 })) })
  }

  async show({ inertia, params }: HttpContext) {
    await this.firstVisit()
    return inertia.render('newspaper/show', {
      newspaper: await this.view.newspaper(String(params.day)),
      today: toIsoDate(today()),
    })
  }

  async choice({ inertia, params }: HttpContext) {
    const day = String(params.day)
    const justInstalled = await this.firstVisit()
    const [choice, sources] = await Promise.all([this.news.choice(day), this.news.sources()])
    if (justInstalled) {
      return inertia.render('newspaper/choice', {
        choice,
        hasSources: true,
        loading: true,
        today: toIsoDate(today()),
      })
    }
    return inertia.render('newspaper/choice', {
      choice,
      hasSources: sources.length > 0,
      loading: false,
      today: toIsoDate(today()),
    })
  }

  async saveChoice({ request, response, params, session }: HttpContext) {
    const day = String(params.day)
    const { itemIds } = await request.validateUsing(newsPicksValidator)
    await this.news.savePicks(day, itemIds ?? [])
    /** Fetched now so that the sheet opens with the full texts ready. */
    await this.news.edition(day)
    session.flash('success', `${(itemIds ?? []).length} article(s) dans le journal`)
    return response.redirect().toRoute('newspapers.show', { day })
  }

  async refresh({ response, session }: HttpContext) {
    const { fetched, failed } = await this.news.refreshAll()
    session.flash(
      failed > 0 ? 'error' : 'success',
      failed > 0
        ? `${fetched} source(s) actualisée(s), ${failed} en erreur`
        : `${fetched} source(s) actualisée(s)`
    )
    return response.redirect().back()
  }

  async sources({ inertia }: HttpContext) {
    await this.firstVisit()
    const [sources, settings, suggestions] = await Promise.all([
      this.news.sources(),
      this.news.settings(),
      this.news.suggestions(),
    ])
    return inertia.render('newspaper/sources', { sources, settings, suggestions })
  }

  async storeSource({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(newsSourceValidator)
    const source = await this.news.addSource(payload)
    session.flash('success', `« ${source.name} » ajouté`)
    return response.redirect().toRoute('newspapers.sources')
  }

  async storeSuggestion({ request, response, session }: HttpContext) {
    const { url } = await request.validateUsing(suggestionValidator)
    const source = await this.news.addSuggestion(url)
    session.flash('success', `« ${source.name} » ajouté`)
    return response.redirect().back()
  }

  async updateSource({ request, response, params }: HttpContext) {
    await this.news.updateSource(
      Number(params.id),
      await request.validateUsing(newsSourceUpdateValidator)
    )
    return response.redirect().back()
  }

  async destroySource({ response, params, session }: HttpContext) {
    await this.news.deleteSource(Number(params.id))
    session.flash('success', 'Source supprimée')
    return response.redirect().back()
  }

  /**
   * The city is turned into coordinates for the weather (Open-Meteo).
   */
  async saveSettings({ request, response, session }: HttpContext) {
    const { title, city, perSection, horoscopeSigns, schoolZone } = await request.validateUsing(
      newspaperSettingsValidator
    )
    let place: { name: string; latitude: number; longitude: number } | null = null
    if (city) {
      try {
        place = await this.weather.geocode(city)
      } catch (error) {
        if (!(error instanceof Exception && error.code === SAFE_FETCH_CODE)) throw error
        throw new errors.E_VALIDATION_ERROR([
          { field: 'city', message: 'Service météo injoignable, réessayez', rule: 'geocode' },
        ])
      }
      if (!place) {
        throw new errors.E_VALIDATION_ERROR([
          { field: 'city', message: 'Ville introuvable', rule: 'geocode' },
        ])
      }
    }
    await this.news.saveSettings({
      title,
      perSection,
      horoscopeSigns: horoscopeSigns ?? [],
      schoolZone: schoolZone ?? null,
      city: place?.name ?? null,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
    })
    session.flash('success', 'Réglages du journal enregistrés')
    return response.redirect().back()
  }
}
