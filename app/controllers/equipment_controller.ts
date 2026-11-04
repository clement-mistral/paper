import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import EquipmentService from '#domains/maison/services/equipment_service'
import HomeService from '#domains/maison/services/home_service'
import { equipmentValidator } from '#domains/maison/validators/home'

@inject()
export default class EquipmentController {
  constructor(
    private equipment: EquipmentService,
    private homes: HomeService
  ) {}

  async create({ inertia, params }: HttpContext) {
    const home = await this.homes.detail(Number(params.id))
    return inertia.render('fiches/equipment/form', {
      home: { id: home.id, name: home.name },
      equipment: null,
    })
  }

  async store({ request, response, params, session }: HttpContext) {
    const { price, ...payload } = await request.validateUsing(equipmentValidator)
    const equipment = await this.equipment.create(Number(params.id), {
      ...payload,
      priceCents: price,
    })
    session.flash('success', `Équipement « ${equipment.name} » ajouté`)
    return response.redirect().toRoute('equipment.show', { id: equipment.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/equipment/show', {
      equipment: await this.equipment.detail(Number(params.id)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    const equipment = await this.equipment.detail(Number(params.id))
    return inertia.render('fiches/equipment/form', {
      home: { id: equipment.homeId, name: equipment.homeName },
      equipment,
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const { price, ...payload } = await request.validateUsing(equipmentValidator)
    const equipment = await this.equipment.update(Number(params.id), {
      ...payload,
      priceCents: price,
    })
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('equipment.show', { id: equipment.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    const equipment = await this.equipment.delete(Number(params.id))
    session.flash('success', 'Équipement supprimé')
    return response.redirect().toRoute('homes.show', { id: equipment.homeId })
  }
}
