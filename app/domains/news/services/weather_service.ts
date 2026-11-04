import { fetchPublicText } from '#support/safe_fetch'
import type { Weather } from '#shared/types/news'

/**
 * WMO weather codes (Open-Meteo) in French.
 */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé'
  if (code <= 2) return 'Éclaircies'
  if (code === 3) return 'Couvert'
  if (code === 45 || code === 48) return 'Brouillard'
  if (code >= 51 && code <= 57) return 'Bruine'
  if (code >= 61 && code <= 67) return 'Pluie'
  if (code >= 71 && code <= 77) return 'Neige'
  if (code >= 80 && code <= 82) return 'Averses'
  if (code === 85 || code === 86) return 'Averses de neige'
  if (code >= 95) return 'Orages'
  return 'Temps variable'
}

const CACHE_MS = 60 * 60 * 1000
const cache = new Map<string, { at: number; weather: Weather | null }>()

type ForecastJson = {
  daily?: {
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: Array<number | null>
    sunrise?: string[]
    sunset?: string[]
  }
}

/**
 * Forecast of the sheet's city from Open-Meteo (free, no key). Cached an
 * hour; any failure gives null and the sheet says « indisponible ».
 */
export default class WeatherService {
  async forecast(latitude: number, longitude: number, day: string): Promise<Weather | null> {
    const key = `${latitude},${longitude},${day}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.weather

    let weather: Weather | null = null
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
        timezone: 'Europe/Paris',
        start_date: day,
        end_date: day,
      }).toString()
      const { text } = await fetchPublicText(url.toString(), {
        accept: 'application/json',
        timeoutMs: 5000,
        maxBytes: 100_000,
      })
      const daily = (JSON.parse(text) as ForecastJson).daily
      if (daily?.weather_code?.length) {
        weather = {
          code: daily.weather_code[0],
          label: weatherLabel(daily.weather_code[0]),
          minC: Math.round(daily.temperature_2m_min?.[0] ?? 0),
          maxC: Math.round(daily.temperature_2m_max?.[0] ?? 0),
          rainChance: daily.precipitation_probability_max?.[0] ?? null,
          sunrise: daily.sunrise?.[0]?.slice(11, 16) ?? null,
          sunset: daily.sunset?.[0]?.slice(11, 16) ?? null,
        }
      }
    } catch {
      weather = null
    }
    cache.set(key, { at: Date.now(), weather })
    return weather
  }

  /**
   * « Rennes » → coordinates, through Open-Meteo's geocoding (France
   * first).
   */
  async geocode(
    city: string
  ): Promise<{ name: string; latitude: number; longitude: number } | null> {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
    url.search = new URLSearchParams({ name: city, count: '5', language: 'fr' }).toString()
    const { text } = await fetchPublicText(url.toString(), {
      accept: 'application/json',
      timeoutMs: 5000,
      maxBytes: 200_000,
    })
    const results =
      (
        JSON.parse(text) as {
          results?: Array<{
            name: string
            latitude: number
            longitude: number
            country_code?: string
          }>
        }
      ).results ?? []
    const best = results.find((result) => result.country_code === 'FR') ?? results[0]
    return best ? { name: best.name, latitude: best.latitude, longitude: best.longitude } : null
  }
}
