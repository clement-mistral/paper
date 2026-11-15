import { readFile } from 'node:fs/promises'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AccountService from '#domains/budget/services/account_service'
import BankImportService from '#domains/budget/services/bank_import_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import { StatementError } from '#domains/budget/import/statement'
import { bankLinesValidator } from '#domains/budget/validators/bank_import'

/**
 * Importing a bank statement on an account fiche: upload, review, confirm
 * (or cancel). Nothing is recorded before the confirmation.
 */
@inject()
export default class BankImportsController {
  constructor(
    private imports: BankImportService,
    private accounts: AccountService,
    private envelopes: EnvelopeService
  ) {}

  async create({ inertia, params }: HttpContext) {
    const accountId = Number(params.id)
    const [account, history] = await Promise.all([
      this.accounts.detail(accountId),
      this.imports.history(accountId),
    ])
    return inertia.render('fiches/accounts/import', {
      account: { id: account.id, name: account.name },
      history,
    })
  }

  async store({ params, request, response, session }: HttpContext) {
    const accountId = Number(params.id)
    const file = request.file('statement', {
      size: '2mb',
      extnames: ['csv', 'ofx', 'qfx', 'txt'],
    })
    if (!file || !file.isValid || !file.tmpPath) {
      session.flash(
        'error',
        file?.errors[0]?.message ?? 'Choisissez un relevé au format CSV ou OFX (2 Mo au plus)'
      )
      return response.redirect().back()
    }
    try {
      const bytes = await readFile(file.tmpPath)
      const staged = await this.imports.stage(accountId, {
        name: file.clientName,
        bytes: new Uint8Array(bytes),
      })
      return response
        .redirect()
        .toRoute('bank_imports.show', { id: accountId, importId: staged.id })
    } catch (error) {
      if (!(error instanceof StatementError)) throw error
      session.flash('error', error.message)
      return response.redirect().back()
    }
  }

  async show({ inertia, params }: HttpContext) {
    const accountId = Number(params.id)
    const [bankImport, envelopes] = await Promise.all([
      this.imports.detail(accountId, Number(params.importId)),
      this.envelopes.list(),
    ])
    return inertia.render('fiches/accounts/import_review', {
      bankImport,
      envelopes: envelopes.map(({ id, name }) => ({ id, name })),
    })
  }

  async confirm({ params, request, response, session }: HttpContext) {
    const accountId = Number(params.id)
    const { lines } = await request.validateUsing(bankLinesValidator)
    const { created, confirmed } = await this.imports.confirm(
      accountId,
      Number(params.importId),
      lines
    )
    const parts = [
      `${created} opération${created > 1 ? 's' : ''} importée${created > 1 ? 's' : ''}`,
    ]
    if (confirmed > 0)
      parts.push(
        `${confirmed} déjà saisie${confirmed > 1 ? 's' : ''} rapprochée${confirmed > 1 ? 's' : ''}`
      )
    session.flash('success', parts.join(', '))
    return response.redirect().toRoute('accounts.show', { id: accountId })
  }

  async destroy({ params, response, session }: HttpContext) {
    const accountId = Number(params.id)
    const result = await this.imports.cancel(accountId, Number(params.importId))
    session.flash('success', result === 'undone' ? 'Import annulé' : 'Relevé abandonné')
    return response.redirect().toRoute('bank_imports.create', { id: accountId })
  }
}
