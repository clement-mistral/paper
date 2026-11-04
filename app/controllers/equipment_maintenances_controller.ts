import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import EquipmentMaintenanceService from '#domains/maison/services/equipment_maintenance_service'
import EquipmentService from '#domains/maison/services/equipment_service'
import {
  completeEquipmentMaintenanceValidator,
  doneEquipmentMaintenanceValidator,
  plannedEquipmentMaintenanceValidator,
} from '#domains/maison/validators/home'
import BudgetOptionsView from '#views/budget_options_view'
import { formatDate } from '#support/format'

@inject()
export default class EquipmentMaintenancesController {
  constructor(
    private maintenances: EquipmentMaintenanceService,
    private equipment: EquipmentService,
    private budget: BudgetOptionsView
  ) {}

  /**
   * `?prevu=1` opens the form of a maintenance to come, otherwise of one
   * already done.
   */
  async create({ inertia, params, request }: HttpContext) {
    const equipment = await this.equipment.detail(Number(params.id))
    return inertia.render('fiches/equipment_maintenances/form', {
      equipment: { id: equipment.id, name: equipment.name },
      maintenance: null,
      mode: request.input('prevu') ? ('planned' as const) : ('done' as const),
      options: await this.budget.options(),
    })
  }

  async store({ request, response, params, session }: HttpContext) {
    const equipmentId = Number(params.id)
    if (request.input('mode') === 'planned') {
      const payload = await request.validateUsing(plannedEquipmentMaintenanceValidator)
      await this.maintenances.createPlanned(equipmentId, payload)
      session.flash('success', 'Entretien prévu')
    } else {
      const { cost, ...payload } = await request.validateUsing(doneEquipmentMaintenanceValidator)
      const maintenance = await this.maintenances.createDone(equipmentId, {
        ...payload,
        costCents: cost,
      })
      const parts = [
        maintenance.costCents ? 'Entretien noté, dépense enregistrée' : 'Entretien noté',
      ]
      if (maintenance.intervalMonths) parts.push('prochain prévu')
      session.flash('success', parts.join(', '))
    }
    return response.redirect().toRoute('equipment.show', { id: equipmentId })
  }

  async edit({ inertia, params }: HttpContext) {
    const maintenance = await this.maintenances.detail(Number(params.id))
    return inertia.render('fiches/equipment_maintenances/form', {
      equipment: { id: maintenance.equipmentId, name: maintenance.equipmentName },
      maintenance,
      mode: maintenance.doneOn ? ('done' as const) : ('planned' as const),
      options: await this.budget.options(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const id = Number(params.id)
    const current = await this.maintenances.detail(id)
    if (current.doneOn) {
      const { cost, ...payload } = await request.validateUsing(doneEquipmentMaintenanceValidator)
      await this.maintenances.updateDone(id, { ...payload, costCents: cost })
    } else {
      const payload = await request.validateUsing(plannedEquipmentMaintenanceValidator)
      await this.maintenances.updatePlanned(id, payload)
    }
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('equipment.show', { id: current.equipmentId })
  }

  async completion({ inertia, params }: HttpContext) {
    return inertia.render('fiches/equipment_maintenances/complete', {
      maintenance: await this.maintenances.detail(Number(params.id)),
      options: await this.budget.options(),
    })
  }

  async complete({ request, response, params, session }: HttpContext) {
    const { cost, ...payload } = await request.validateUsing(completeEquipmentMaintenanceValidator)
    const { maintenance, next } = await this.maintenances.complete(Number(params.id), {
      ...payload,
      costCents: cost,
    })
    const parts = [maintenance.costCents ? 'Entretien noté, dépense enregistrée' : 'Entretien noté']
    if (next?.dueOn) parts.push(`prochain prévu le ${formatDate(next.dueOn)}`)
    session.flash('success', parts.join(', '))
    return response.redirect().toRoute('equipment.show', { id: maintenance.equipmentId })
  }

  async destroy({ response, params, session }: HttpContext) {
    const maintenance = await this.maintenances.delete(Number(params.id))
    session.flash('success', 'Entretien supprimé')
    return response.redirect().toRoute('equipment.show', { id: maintenance.equipmentId })
  }
}
