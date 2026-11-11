import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PortfolioService from '#domains/budget/services/portfolio_service'
import AccountService from '#domains/budget/services/account_service'
import { holdingValidator, operationValidator } from '#domains/budget/validators/portfolio'
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
    private accounts: AccountService
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
    const [account, operations, holdings] = await Promise.all([
      this.portfolio.account(id),
      this.portfolio.operations({ accountId: id }),
      this.portfolio.holdingsOf(id),
    ])
    return inertia.render('fiches/placements/show', {
      account,
      operations,
      holdings,
      today: toIsoDate(today()),
    })
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
