import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { extractAmount } from '#capture/extractors'
import {
  amountField,
  dateField,
  hasOverride,
  isoDate,
  pick,
  read,
  selectField,
  textField,
} from '#capture/fields'
import type { NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import { parseExpense } from '#capture/intents/expense_intent'
import AccountService from '#domains/budget/services/account_service'
import TransactionService from '#domains/budget/services/transaction_service'
import { expenseValidator } from '#domains/budget/validators/expense'
import { fromIsoDate, today } from '#support/dates'
import { formatAmount, formatDate } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'

/**
 * Words of money coming in. « paye » is left out: it is also « payé ».
 */
export const INCOME_KEYWORDS = [
  'salaire',
  'remboursement',
  'rembourse',
  'recu',
  'recus',
  'encaisse',
  'vente',
  'vendu',
  'prime',
  'allocation',
  'caf',
  'interets',
  'dividende',
  'dividendes',
  'gain',
  'revenu',
  'revenus',
  'entree',
]

/**
 * « salaire 2 100 € », « remboursement sécu 25 € », « vendu le vélo 80 €
 * hier » → an income on the default account.
 */
@inject()
export default class IncomeIntent implements CaptureIntent {
  info = { name: 'income', label: 'Entrée d’argent', domain: 'budget' } as const
  keywords = INCOME_KEYWORDS

  constructor(
    private accounts: AccountService,
    private transactions: TransactionService
  ) {}

  /**
   * An income word is required; with an amount it beats the generic
   * expense (0.6 to 0.8).
   */
  score(input: NormalizedInput): number {
    if (matchedKeywords(input, this.keywords).length === 0) return 0
    return extractAmount(input.raw) ? 0.85 : 0.5
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }
    const { amountCents, label, occurredOn, accountId } = draft.data
    const effects: IntentDraft['effects'] = [
      {
        domain: 'budget',
        title: `Entrée de ${formatAmount(amountCents!)} · ${label}`,
        detail: formatDate(fromIsoDate(occurredOn)),
      },
    ]
    if (accountId) {
      const account = await this.accounts.detail(accountId)
      effects.push({
        domain: 'budget',
        title: `${account.name} : ${formatAmount(account.balanceCents)} → ${formatAmount(account.balanceCents + amountCents!)}`,
      })
    }
    return { status: 'ready', intent: this.info, fields: draft.fields, missing: [], effects }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    const data = await expenseValidator.validate({ ...draft.data, envelopeId: null })
    const transaction = await this.transactions.recordIncome(data, trx, {
      captureText: input.original,
    })
    return {
      message: `Entrée de ${formatAmount(data.amountCents)} enregistrée`,
      created: [{ type: 'transaction' as const, id: transaction.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseExpense(input.raw)
    const [accounts, defaultAccount] = await Promise.all([
      this.accounts.list(),
      this.accounts.defaultAccount(),
    ])

    const amount = pick(overrides, 'amountCents', parsed.amountCents, read.cents)
    const label = pick(overrides, 'label', parsed.label, read.text)
    const occurredOn = pick(
      overrides,
      'occurredOn',
      isoDate(parsed.occurredOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const accountOverridden = hasOverride(overrides, 'accountId')
    const accountId = accountOverridden
      ? read.id(overrides.accountId ?? null)
      : (defaultAccount?.id ?? null)

    const missing: string[] = []
    if (amount.value === null || amount.value <= 0) missing.push('Montant')
    if (label.value === '') missing.push('Libellé')

    return {
      data: {
        amountCents: amount.value,
        label: label.value,
        occurredOn: occurredOn.value,
        accountId,
      },
      missing,
      fields: [
        amountField(
          'amountCents',
          'Montant',
          amount.value,
          amount.overridden,
          parsed.amountCents !== null
        ),
        textField('label', 'Libellé', label.value, label.overridden),
        dateField(
          'occurredOn',
          'Date',
          occurredOn.value,
          occurredOn.overridden,
          !!parsed.occurredOn
        ),
        selectField(
          'accountId',
          'Compte',
          accountId,
          [
            { value: null, label: 'Aucun compte' },
            ...accounts.map(({ id, name }) => ({ value: id, label: name })),
          ],
          accountOverridden ? 'override' : accountId ? 'default' : 'empty'
        ),
      ],
    }
  }
}
