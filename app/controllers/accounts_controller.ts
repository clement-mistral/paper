import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AccountService from '#domains/budget/services/account_service'
import { accountValidator } from '#domains/budget/validators/account'
import MoneyView from '#views/money_view'

@inject()
export default class AccountsController {
  constructor(
    private accounts: AccountService,
    private money: MoneyView
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/accounts/index', { accounts: await this.accounts.list() })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('fiches/accounts/form', { account: null })
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(accountValidator)
    const account = await this.accounts.create(payload)
    session.flash('success', `Compte « ${account.name} » créé`)
    return response.redirect().toRoute('accounts.show', { id: account.id })
  }

  async show({ inertia, params }: HttpContext) {
    const id = Number(params.id)
    const [account, transactions] = await Promise.all([
      this.accounts.detail(id),
      this.money.recentTransactions({ accountId: id }),
    ])
    const balanceHistory = await this.money.balanceHistory(id, account.openingBalanceCents)
    return inertia.render('fiches/accounts/show', { account, transactions, balanceHistory })
  }

  async edit({ inertia, params }: HttpContext) {
    return inertia.render('fiches/accounts/form', {
      account: await this.accounts.detail(Number(params.id)),
    })
  }

  async update({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(accountValidator)
    const account = await this.accounts.update(Number(params.id), payload)
    session.flash('success', 'Modifications enregistrées')
    return response.redirect().toRoute('accounts.show', { id: account.id })
  }

  async destroy({ response, params, session }: HttpContext) {
    await this.accounts.delete(Number(params.id))
    session.flash('success', 'Compte supprimé')
    return response.redirect().toRoute('accounts.index')
  }
}
