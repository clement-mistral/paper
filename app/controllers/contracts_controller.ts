import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ContractService from '#domains/maison/services/contract_service'
import SubscriptionService from '#domains/maison/services/subscription_service'
import { contractValidator } from '#domains/maison/validators/household'

@inject()
export default class ContractsController {
  constructor(
    private contracts: ContractService,
    private subscriptions: SubscriptionService
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/contracts/index', { contracts: await this.contracts.list() })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/contracts/form', {
      contract: null,
      subscriptions: await this.subscriptionOptions(),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const contract = await this.contracts.create(await request.validateUsing(contractValidator))
    session.flash('success', `Contrat « ${contract.name} » créé`)
    return response.redirect().toRoute('contracts.show', { id: contract.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/contracts/show', {
      contract: await this.contracts.detail(Number(params.id)),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/contracts/form', {
      contract: await this.contracts.detail(Number(params.id)),
      subscriptions: await this.subscriptionOptions(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const contract = await this.contracts.update(
      Number(params.id),
      await request.validateUsing(contractValidator)
    )
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('contracts.show', { id: contract.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.contracts.delete(Number(params.id))
    session.flash('success', 'Contrat supprimé')
    return response.redirect().toRoute('contracts.index')
  }

  private async subscriptionOptions() {
    const subscriptions = await this.subscriptions.list()
    return subscriptions.map(({ id, name }) => ({ id, name }))
  }
}
