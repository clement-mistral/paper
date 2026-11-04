import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ClaimService from '#domains/maison/services/claim_service'
import ContractService from '#domains/maison/services/contract_service'
import HomeService from '#domains/maison/services/home_service'
import { claimValidator } from '#domains/maison/validators/household'

/**
 * « Sinistres » : insurance claims on the home.
 */
@inject()
export default class ClaimsController {
  constructor(
    private claims: ClaimService,
    private contracts: ContractService,
    private homes: HomeService
  ) {}

  async create({ inertia, response }: HttpContext) {
    const home = await this.homes.current()
    if (!home) return response.redirect().toRoute('homes.create')
    return inertia.render('fiches/claims/form', {
      homeId: home.id,
      claim: null,
      insurances: await this.contracts.insurances(),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const claim = await this.claims.create(await this.payload(request))
    session.flash('success', `Sinistre « ${claim.title} » enregistré`)
    return response.redirect().toRoute('claims.show', { id: claim.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/claims/show', {
      claim: await this.claims.detail(Number(params.id)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    const claim = await this.claims.detail(Number(params.id))
    return inertia.render('fiches/claims/form', {
      homeId: claim.homeId,
      claim,
      insurances: await this.contracts.insurances(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const claim = await this.claims.update(Number(params.id), await this.payload(request))
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('claims.show', { id: claim.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    const claim = await this.claims.delete(Number(params.id))
    session.flash('success', 'Sinistre supprimé')
    return response.redirect().toRoute('homes.show', { id: claim.homeId })
  }

  private async payload(request: HttpContext['request']) {
    const { damage, deductible, compensation, ...payload } =
      await request.validateUsing(claimValidator)
    return {
      ...payload,
      damageCents: damage,
      deductibleCents: deductible,
      compensationCents: compensation,
    }
  }
}
