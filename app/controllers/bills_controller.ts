import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BillService from '#domains/maison/services/bill_service'
import { billFormValidator } from '#domains/maison/validators/forms'
import BudgetOptionsView from '#views/budget_options_view'

@inject()
export default class BillsController {
  constructor(
    private bills: BillService,
    private budget: BudgetOptionsView
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/bills/index', { bills: await this.bills.list() })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/bills/form', { bill: null, options: await this.budget.options() })
  }

  async store({ request, response, session }: HttpContext) {
    const { amount, ...payload } = await request.validateUsing(billFormValidator)
    const bill = await this.bills.create({ ...payload, amountCents: amount })
    session.flash('success', `Facture ${bill.provider} enregistrée`)
    return response.redirect().toRoute('bills.show', { id: bill.id })
  }

  async show({ inertia, params }: HttpContext) {
    return inertia.render('fiches/bills/show', {
      bill: await this.bills.detail(Number(params.id)),
      options: await this.budget.options(),
    })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/bills/form', {
      bill: await this.bills.detail(Number(params.id)),
      options: await this.budget.options(),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const { amount, ...payload } = await request.validateUsing(billFormValidator)
    const bill = await this.bills.update(Number(params.id), { ...payload, amountCents: amount })
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('bills.show', { id: bill.id })
  }

  async pay({ response, params, session }: HttpContext) {
    await this.bills.markPaid(Number(params.id))
    session.flash('success', 'Facture marquée payée, dépense enregistrée')
    return response.redirect().back()
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.bills.delete(Number(params.id))
    session.flash('success', 'Facture supprimée')
    return response.redirect().toRoute('bills.index')
  }
}
