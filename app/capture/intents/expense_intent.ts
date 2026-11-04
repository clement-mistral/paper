import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import BudgetFields from '#capture/budget_fields'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cleanLabel, cutSpans, extractAmount, extractPastDate } from '#capture/extractors'
import { amountField, dateField, isoDate, pick, read, textField } from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import AliasService from '#capture/services/alias_service'
import TransactionService from '#domains/budget/services/transaction_service'
import { expenseValidator } from '#domains/budget/validators/expense'
import { fromIsoDate, now, today } from '#support/dates'
import { formatAmount, formatDate } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'

export type ParsedExpense = {
  amountCents: number | null
  /** True when the amount came with « € » or « euros ». */
  explicitAmount: boolean
  occurredOn: DateTime | null
  label: string
  /** Text left once amount and date are removed, used to match entities. */
  rest: string
}

/**
 * Pure extraction step of the expense intent, kept apart so the phrase
 * corpus can be tested without a database.
 */
export function parseExpense(raw: string, reference: DateTime = now()): ParsedExpense {
  const amount = extractAmount(raw)
  const withoutAmount = amount ? cutSpans(raw, [amount]) : raw
  const date = extractPastDate(withoutAmount, reference)
  const rest = date ? cutSpans(withoutAmount, [date]) : withoutAmount
  return {
    amountCents: amount?.cents ?? null,
    explicitAmount: amount?.explicit ?? false,
    occurredOn: date?.date ?? null,
    label: cleanLabel(rest),
    rest,
  }
}

/**
 * « acheter » is left out on purpose: « acheter du pain » is a shopping
 * list item, not an expense.
 */
const KEYWORDS = ['depense', 'depenses', 'achat', 'paye', 'payer', 'ticket', 'debit']

/**
 * « café 4,50 € », « resto 32 € hier », « dépense 12 € pharmacie lundi »
 * → an expense in Budget, routed to an envelope by its keywords.
 */
@inject()
export default class ExpenseIntent implements CaptureIntent {
  info = { name: 'expense', label: 'Dépense', domain: 'budget' } as const
  keywords = KEYWORDS

  constructor(
    private aliases: AliasService,
    private budget: BudgetFields,
    private transactions: TransactionService
  ) {}

  /**
   * An amount is the main signal: an explicit « € » is worth more than a
   * bare number. An expense word alone (« dépense resto ») is enough to
   * open an incomplete preview, but next to an amount it only adds a
   * little: the expense is the generic fallback, more specific intents
   * (bill, fuel, subscription) must win over it.
   */
  score(input: NormalizedInput): number {
    const amount = extractAmount(input.raw)
    const keyword = matchedKeywords(input, this.keywords).length > 0
    if (!amount) return keyword ? 0.5 : 0
    return (amount.explicit ? 0.6 : 0.5) + (keyword ? 0.2 : 0)
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }

    const { amountCents, label, occurredOn } = draft.data
    const envelopeName = await this.budget.envelopeName(draft.budget.envelopeId)
    return {
      status: 'ready',
      intent: this.info,
      fields: draft.fields,
      missing: [],
      effects: [
        {
          domain: 'budget',
          title: `Dépense de ${formatAmount(amountCents!)} · ${label}`,
          detail: [
            formatDate(fromIsoDate(occurredOn)),
            envelopeName ? `Enveloppe ${envelopeName}` : 'Sans enveloppe',
          ].join(' · '),
        },
        ...(await this.budget.effects(draft.budget, amountCents!, occurredOn)),
      ],
    }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    const data = await expenseValidator.validate(draft.data)

    const transaction = await this.transactions.recordExpense(data, trx, {
      captureText: input.original,
    })

    /**
     * The user moved the expense to another envelope: remember it, so the
     * same label lands there next time.
     */
    if (
      draft.budget.envelopeOverridden &&
      data.envelopeId !== null &&
      data.envelopeId !== draft.budget.matchedEnvelopeId
    ) {
      await this.aliases.learn('envelope', data.envelopeId, data.label, trx)
    }

    return {
      message: `Dépense de ${formatAmount(data.amountCents)} enregistrée`,
      created: [{ type: 'transaction' as const, id: transaction.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseExpense(input.raw)

    const amount = pick(overrides, 'amountCents', parsed.amountCents, read.cents)
    const label = pick(overrides, 'label', parsed.label, read.text)
    const occurredOn = pick(
      overrides,
      'occurredOn',
      isoDate(parsed.occurredOn ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const budget = await this.budget.resolve(normalize(parsed.rest), overrides)

    const missing: string[] = []
    if (amount.value === null || amount.value <= 0) missing.push('Montant')
    if (label.value === '') missing.push('Libellé')

    return {
      data: {
        amountCents: amount.value,
        label: label.value,
        occurredOn: occurredOn.value,
        envelopeId: budget.envelopeId,
        accountId: budget.accountId,
      },
      budget,
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
        ...budget.fields,
      ],
    }
  }
}
