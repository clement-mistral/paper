import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SubscriptionService from '#domains/maison/services/subscription_service'
import { subscriptionFormValidator } from '#domains/maison/validators/forms'
import BudgetOptionsView from '#views/budget_options_view'

@inject()
export default class SubscriptionsController {
  constructor(
    private subscriptions: SubscriptionService,
    private budget: BudgetOptionsView
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/subscriptions/index', {
      subscriptions: await this.subscriptions.list(),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/subscriptions/form', {
      subscription: null,
      options: await this.budget.options(),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const { price, ...payload } = await request.validateUsing(subscriptionFormValidator)
    const subscription = await this.subscriptions.create({ ...payload, priceCents: price })
    session.flash('success', `Abonnement « ${subscription.name} » créé`)
    return response.redirect().toRoute('subscriptions.show', { id: subscription.id })
  }

  async show({ inertia, params }: HttpContext) {
    const id = Number(params.id)
    const [subscription, charges] = await Promise.all([
      this.subscriptions.detail(id),
      this.subscriptions.charges(id),
    ])
    return inertia.render('fiches/subscriptions/show', {
      subscription,
      charges,
      options: await this.budget.options(),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/subscriptions/form', {
      subscription: await this.subscriptions.detail(Number(params.id)),
      options: await this.budget.options(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const { price, ...payload } = await request.validateUsing(subscriptionFormValidator)
    const subscription = await this.subscriptions.update(Number(params.id), {
      ...payload,
      priceCents: price,
    })
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('subscriptions.show', { id: subscription.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.subscriptions.delete(Number(params.id))
    session.flash('success', 'Abonnement supprimé')
    return response.redirect().toRoute('subscriptions.index')
  }
}
