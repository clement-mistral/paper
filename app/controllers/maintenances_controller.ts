import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import {
  completeMaintenanceValidator,
  doneMaintenanceValidator,
  plannedMaintenanceValidator,
} from '#domains/auto/validators/maintenance'
import BudgetOptionsView from '#views/budget_options_view'
import { formatDate } from '#support/format'

@inject()
export default class MaintenancesController {
  constructor(
    private maintenances: MaintenanceService,
    private vehicles: VehicleService,
    private budget: BudgetOptionsView
  ) {}

  /**
   * `?prevu=1` opens the form of a maintenance to come, otherwise of one
   * already done.
   */
  async create({ inertia, params, request }: HttpContext) {
    const vehicle = await this.vehicles.detail(Number(params.id))
    return inertia.render('fiches/maintenances/form', {
      vehicle: { id: vehicle.id, name: vehicle.name, odometerKm: vehicle.odometerKm },
      maintenance: null,
      mode: request.input('prevu') ? ('planned' as const) : ('done' as const),
      options: await this.budget.options(),
    })
  }

  async store({ request, response, params, session }: HttpContext) {
    const vehicleId = Number(params.id)
    if (request.input('mode') === 'planned') {
      const payload = await request.validateUsing(plannedMaintenanceValidator)
      await this.maintenances.createPlanned(vehicleId, payload)
      session.flash('success', 'Entretien prévu')
    } else {
      const { cost, ...payload } = await request.validateUsing(doneMaintenanceValidator)
      const { maintenance } = await this.maintenances.createDone(vehicleId, {
        ...payload,
        costCents: cost,
      })
      session.flash(
        'success',
        this.doneMessage(
          maintenance.costCents,
          maintenance.intervalKm || maintenance.intervalMonths
        )
      )
    }
    return response.redirect().toRoute('vehicles.show', { id: vehicleId })
  }

  async edit({ inertia, params }: HttpContext) {
    const maintenance = await this.maintenances.detail(Number(params.id))
    return inertia.render('fiches/maintenances/form', {
      vehicle: {
        id: maintenance.vehicleId,
        name: maintenance.vehicleName,
        odometerKm: maintenance.vehicleOdometerKm,
      },
      maintenance,
      mode: maintenance.doneOn ? ('done' as const) : ('planned' as const),
      options: await this.budget.options(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const id = Number(params.id)
    const current = await this.maintenances.detail(id)
    if (current.doneOn) {
      const { cost, ...payload } = await request.validateUsing(doneMaintenanceValidator)
      await this.maintenances.updateDone(id, { ...payload, costCents: cost })
    } else {
      const payload = await request.validateUsing(plannedMaintenanceValidator)
      await this.maintenances.updatePlanned(id, payload)
    }
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('vehicles.show', { id: current.vehicleId })
  }

  async completion({ inertia, params }: HttpContext) {
    return inertia.render('fiches/maintenances/complete', {
      maintenance: await this.maintenances.detail(Number(params.id)),
      options: await this.budget.options(),
    })
  }

  async complete({ request, response, params, session }: HttpContext) {
    const { cost, ...payload } = await request.validateUsing(completeMaintenanceValidator)
    const { maintenance, next } = await this.maintenances.complete(Number(params.id), {
      ...payload,
      costCents: cost,
    })
    const parts = [this.doneMessage(maintenance.costCents, false)]
    if (next) {
      parts.push(next.dueOn ? `prochain prévu le ${formatDate(next.dueOn)}` : 'prochain prévu')
    }
    session.flash('success', parts.join(', '))
    return response.redirect().toRoute('vehicles.show', { id: maintenance.vehicleId })
  }

  async destroy({ response, params, session }: HttpContext) {
    const maintenance = await this.maintenances.delete(Number(params.id))
    session.flash('success', 'Entretien supprimé')
    return response.redirect().toRoute('vehicles.show', { id: maintenance.vehicleId })
  }

  private doneMessage(costCents: number | null, periodic: number | boolean | null) {
    const message = costCents ? 'Entretien noté, dépense enregistrée' : 'Entretien noté'
    return periodic ? `${message}, prochain prévu` : message
  }
}
