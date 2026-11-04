import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CircuitService from '#domains/maison/services/circuit_service'
import HomeService from '#domains/maison/services/home_service'
import { circuitValidator } from '#domains/maison/validators/home'

@inject()
export default class CircuitsController {
  constructor(
    private circuits: CircuitService,
    private homes: HomeService
  ) {}

  async create({ inertia, params }: HttpContext) {
    const home = await this.homes.detail(Number(params.id))
    return inertia.render('fiches/circuits/form', {
      home: { id: home.id, name: home.name },
      circuit: null,
      /** Next free reference, « C4 » after C1–C3. */
      suggestedReference: `C${home.circuitCount + 1}`,
    })
  }

  async store({ request, response, params, session }: HttpContext) {
    const homeId = Number(params.id)
    const circuit = await this.circuits.create(
      homeId,
      await request.validateUsing(circuitValidator)
    )
    session.flash('success', `Circuit ${circuit.reference} ajouté`)
    return response.redirect().toRoute('homes.show', { id: homeId })
  }

  async edit({ inertia, params }: HttpContext) {
    const circuit = await this.circuits.detail(Number(params.id))
    const home = await this.homes.detail(circuit.homeId)
    return inertia.render('fiches/circuits/form', {
      home: { id: home.id, name: home.name },
      circuit,
      suggestedReference: circuit.reference,
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const circuit = await this.circuits.update(
      Number(params.id),
      await request.validateUsing(circuitValidator)
    )
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('homes.show', { id: circuit.homeId })
  }

  async destroy({ response, params, session }: HttpContext) {
    const circuit = await this.circuits.delete(Number(params.id))
    session.flash('success', 'Circuit supprimé')
    return response.redirect().toRoute('homes.show', { id: circuit.homeId })
  }
}
