import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import HomeService from '#domains/maison/services/home_service'
import MeterService from '#domains/maison/services/meter_service'
import { meterValidator, readingValidator } from '#domains/maison/validators/home'

@inject()
export default class MetersController {
  constructor(
    private meters: MeterService,
    private homes: HomeService
  ) {}

  async create({ inertia, params }: HttpContext) {
    const home = await this.homes.detail(Number(params.id))
    return inertia.render('fiches/meters/form', {
      home: { id: home.id, name: home.name },
      meter: null,
    })
  }

  async store({ request, response, params, session }: HttpContext) {
    const meter = await this.meters.create(
      Number(params.id),
      await request.validateUsing(meterValidator)
    )
    session.flash('success', `Compteur « ${meter.label} » ajouté`)
    return response.redirect().toRoute('meters.show', { id: meter.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/meters/show', {
      meter: await this.meters.detail(Number(params.id)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    const meter = await this.meters.detail(Number(params.id))
    return inertia.render('fiches/meters/form', {
      home: { id: meter.homeId, name: meter.homeName },
      meter,
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const meter = await this.meters.update(
      Number(params.id),
      await request.validateUsing(meterValidator)
    )
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('meters.show', { id: meter.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    const meter = await this.meters.delete(Number(params.id))
    session.flash('success', 'Compteur supprimé')
    return response.redirect().toRoute('homes.show', { id: meter.homeId })
  }

  async storeReading({ request, response, params, session }: HttpContext) {
    await this.meters.addReading(Number(params.id), await request.validateUsing(readingValidator))
    session.flash('success', 'Relevé enregistré')
    return response.redirect().toRoute('meters.show', { id: Number(params.id) })
  }

  async destroyReading({ response, params, session }: HttpContext) {
    const reading = await this.meters.deleteReading(Number(params.id))
    session.flash('success', 'Relevé supprimé')
    return response.redirect().toRoute('meters.show', { id: reading.meterId })
  }
}
