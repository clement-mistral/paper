import { inject } from '@adonisjs/core'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import type { BudgetOptions } from '#shared/types/maison'

/**
 * Envelope and account choices for the forms of other domains (a
 * subscription, a bill…). Read only.
 */
@inject()
export default class BudgetOptionsView {
  constructor(
    private envelopes: EnvelopeService,
    private accounts: AccountService
  ) {}

  async options(): Promise<BudgetOptions> {
    const [envelopes, accounts] = await Promise.all([this.envelopes.list(), this.accounts.list()])
    return {
      envelopes: envelopes.map(({ id, name }) => ({ id, name })),
      accounts: accounts.map(({ id, name }) => ({ id, name })),
    }
  }
}
