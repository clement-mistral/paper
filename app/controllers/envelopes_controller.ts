import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import EnvelopeService from '#domains/budget/services/envelope_service'
import { envelopeValidator } from '#domains/budget/validators/envelope'
import MoneyView from '#views/money_view'

@inject()
export default class EnvelopesController {
  constructor(
    private envelopes: EnvelopeService,
    private money: MoneyView
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/envelopes/index', { envelopes: await this.envelopes.list() })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/envelopes/form', { envelope: null })
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(envelopeValidator, { meta: {} })
    const envelope = await this.envelopes.create(payload)
    session.flash('success', `Enveloppe « ${envelope.name} » créée`)
    return response.redirect().toRoute('envelopes.show', { id: envelope.id })
  }

  async show({ inertia, params }: HttpContext) {
    const id = Number(params.id)
    const [envelope, transactions, monthlySpending] = await Promise.all([
      this.envelopes.detail(id),
      this.money.recentTransactions({ envelopeId: id }),
      this.money.monthlySpending({ envelopeId: id }),
    ])
    return inertia.render('fiches/envelopes/show', { envelope, transactions, monthlySpending })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/envelopes/form', {
      envelope: await this.envelopes.detail(Number(params.id)),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const id = Number(params.id)
    const payload = await request.validateUsing(envelopeValidator, { meta: { envelopeId: id } })
    await this.envelopes.update(id, payload)
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('envelopes.show', { id })
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.envelopes.delete(Number(params.id))
    session.flash('success', 'Enveloppe supprimée')
    return response.redirect().toRoute('envelopes.index')
  }
}
