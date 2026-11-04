import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import VehicleService from '#domains/auto/services/vehicle_service'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import { vehicleValidator } from '#domains/auto/validators/vehicle'

@inject()
export default class VehiclesController {
  constructor(
    private vehicles: VehicleService,
    private maintenances: MaintenanceService
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/vehicles/index', { vehicles: await this.vehicles.list() })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/vehicles/form', { vehicle: null })
  }

  async store({ request, response, session }: HttpContext) {
    const { estimatedValue, ...payload } = await request.validateUsing(vehicleValidator)
    const vehicle = await this.vehicles.create({ ...payload, estimatedValueCents: estimatedValue })
    session.flash('success', `Véhicule « ${vehicle.name} » créé`)
    return response.redirect().toRoute('vehicles.show', { id: vehicle.id })
  }

  async show({ inertia, params }: HttpContext) {
    const id = Number(params.id)
    const [vehicle, maintenances] = await Promise.all([
      this.vehicles.detail(id),
      this.maintenances.forVehicle(id),
    ])
    return inertia.render('fiches/vehicles/show', { vehicle, maintenances })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/vehicles/form', {
      vehicle: await this.vehicles.detail(Number(params.id)),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const { estimatedValue, ...payload } = await request.validateUsing(vehicleValidator)
    const vehicle = await this.vehicles.update(Number(params.id), {
      ...payload,
      estimatedValueCents: estimatedValue,
    })
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('vehicles.show', { id: vehicle.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.vehicles.delete(Number(params.id))
    session.flash('success', 'Véhicule supprimé')
    return response.redirect().toRoute('vehicles.index')
  }
}
