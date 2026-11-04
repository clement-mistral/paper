import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import TransactionService from '#domains/budget/services/transaction_service'
import { incomeFormValidator, transferFormValidator } from '#domains/budget/validators/money'
import BudgetOptionsView from '#views/budget_options_view'
import MoneyView from '#views/money_view'
import { formatAmount } from '#support/format'

@inject()
export default class MoneyController {
  constructor(
    private money: MoneyView,
    private transactions: TransactionService,
    private budget: BudgetOptionsView
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('money', { overview: await this.money.overview() })
  }

  async incomeForm({ inertia }: HttpContext) {
    return inertia.render('money/income', { options: await this.budget.options() })
  }

  async storeIncome({ request, response, session }: HttpContext) {
    const { amount, ...payload } = await request.validateUsing(incomeFormValidator)
    await db.transaction((trx) =>
      this.transactions.recordIncome(
        { ...payload, amountCents: amount, accountId: payload.accountId ?? null },
        trx
      )
    )
    session.flash('success', `Entrée de ${formatAmount(amount)} enregistrée`)
    return response.redirect().toRoute('money')
  }

  async transferForm({ inertia }: HttpContext) {
    return inertia.render('money/transfer', { options: await this.budget.options() })
  }

  async storeTransfer({ request, response, session }: HttpContext) {
    const { amount, ...payload } = await request.validateUsing(transferFormValidator)
    await db.transaction((trx) =>
      this.transactions.transfer({ ...payload, amountCents: amount }, trx)
    )
    session.flash('success', `Virement de ${formatAmount(amount)} enregistré`)
    return response.redirect().toRoute('money')
  }

  /**
   * Deletes a transaction typed by hand, or both legs of a transfer.
   */
  async destroyTransaction({ params, response, session }: HttpContext) {
    await db.transaction((trx) => this.transactions.deleteManual(Number(params.id), trx))
    session.flash('success', 'Transaction supprimée')
    return response.redirect().back()
  }
}
