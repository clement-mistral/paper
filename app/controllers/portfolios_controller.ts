import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PortfolioService from '#domains/budget/services/portfolio_service'
import AccountService from '#domains/budget/services/account_service'
import InvestmentCalendarService from '#domains/budget/services/investment_calendar_service'
import {
  holdingValidator,
  operationValidator,
  planValidator,
} from '#domains/budget/validators/portfolio'
import { formatAmount } from '#support/format'
import { toIsoDate, today } from '#support/dates'

/**
 * Fiche « Placements » : the investment accounts, their lines and the
 * operations on them, valued at the last quotes.
 */
@inject()
export default class PortfoliosController {
  constructor(
    private portfolio: PortfolioService,
    private accounts: AccountService,
    private calendar: InvestmentCalendarService
  ) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('fiches/placements/index', {
      portfolio: await this.portfolio.overview(),
    })
  }

  async show({ inertia, params, response }: HttpContext) {
    const id = Number(params.id)
    const detail = await this.accounts.detail(id)
    if (detail.type !== 'investment' && (detail.wrapper === null || detail.wrapper === 'livret')) {
      return response.redirect().toRoute('accounts.show', { id })
    }
    const [account, operations, holdings, plans] = await Promise.all([
      this.portfolio.account(id),
      this.portfolio.operations({ accountId: id }),
      this.portfolio.holdingsOf(id),
      this.calendar.plans(id),
    ])
    return inertia.render('fiches/placements/show', {
      account,
      operations,
      holdings,
      plans,
      today: toIsoDate(today()),
    })
  }

  /**
   * A scheduled monthly contribution (« versement programmé »).
   */
  async storePlan({ request, response, params, session }: HttpContext) {
    const accountId = Number(params.id)
    const { amount, dayOfMonth, holdingId } = await request.validateUsing(planValidator)
    const holdings = await this.portfolio.holdingsOf(accountId)
    await this.calendar.createPlan({
      accountId,
      holdingId: holdings.some((holding) => holding.id === holdingId) ? holdingId! : null,
      amountCents: Math.round(amount * 100),
      dayOfMonth,
    })
    session.flash(
      'success',
      `Versement de ${formatAmount(Math.round(amount * 100))} le ${dayOfMonth} de chaque mois`
    )
    return response.redirect().back()
  }

  async destroyPlan({ response, params, session }: HttpContext) {
    await this.calendar.deletePlan(Number(params.id), Number(params.planId))
    session.flash('success', 'Versement programmé supprimé')
    return response.redirect().back()
  }

  async storeOperation({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(operationValidator)
    const { operation, holding, cashAfterCents } = await this.portfolio.recordOperation({
      accountId: Number(params.id),
      holdingId: payload.holdingId ?? null,
      symbol: payload.symbol ?? null,
      name: payload.name ?? null,
      assetClass: payload.assetClass ?? null,
      kind: payload.kind,
      occurredOn: payload.occurredOn,
      quantity: payload.quantity ?? null,
      unitPrice: payload.unitPrice ?? null,
      feesCents: payload.fees ?? 0,
      amountCents: payload.amount ?? null,
    })
    session.flash('success', PortfolioService.describe(operation, holding))
    if (operation.kind === 'buy' && cashAfterCents < 0) {
      session.flash(
        'error',
        `Liquidités du compte à ${formatAmount(cashAfterCents)} : enregistrez le versement qui a financé l’achat.`
      )
    }
    return response.redirect().back()
  }

  async destroyOperation({ response, params, session }: HttpContext) {
    await this.portfolio.deleteOperation(Number(params.id))
    session.flash('success', 'Opération supprimée')
    return response.redirect().back()
  }

  async holding({ inertia, params }: HttpContext) {
    return inertia.render('fiches/placements/holding', {
      holding: await this.portfolio.holding(Number(params.id)),
    })
  }

  async updateHolding({ request, response, params, session }: HttpContext) {
    const payload = await request.validateUsing(holdingValidator)
    await this.portfolio.updateHolding(Number(params.id), {
      name: payload.name,
      assetClass: payload.assetClass,
      manualPrice: payload.manualPrice ?? null,
      notes: payload.notes ?? null,
    })
    session.flash('success', 'Ligne enregistrée')
    return response.redirect().back()
  }

  async destroyHolding({ response, params, session }: HttpContext) {
    const holding = await this.portfolio.deleteHolding(Number(params.id))
    session.flash('success', `Ligne « ${holding.name} » supprimée`)
    return response.redirect().toRoute('portfolios.show', { id: holding.accountId })
  }
}
