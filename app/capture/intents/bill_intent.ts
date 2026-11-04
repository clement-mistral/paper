import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import BudgetFields from '#capture/budget_fields'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cleanLabel, cutSpans, extractAmount, extractDate, removeWords } from '#capture/extractors'
import {
  amountField,
  dateField,
  isoDate,
  pick,
  read,
  selectField,
  textField,
} from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import AliasService from '#capture/services/alias_service'
import BillService from '#domains/maison/services/bill_service'
import { billValidator } from '#domains/maison/validators/bill'
import { fromIsoDate, now, today } from '#support/dates'
import { formatAmount, formatDate } from '#support/format'
import type { CaptureEffect, CaptureOverrides } from '#shared/types/capture'

const KEYWORDS = ['facture', 'factures']

const PAID = /\b(?:pay[ée]e?s?|r[ée]gl[ée]e?s?|acquitt[ée]e?s?)\b/i

const NOISE = ['facture', 'factures', 'de', 'du', 'd', 'a', 'payer', 'avant', 'pour']

export type ParsedBill = {
  provider: string
  amountCents: number | null
  date: DateTime | null
  paid: boolean
}

/**
 * Pure extraction step. A paid bill is dated in the past (« payée hier »),
 * an unpaid one in the future (« le 15 » = next 15th).
 */
export function parseBill(raw: string, reference: DateTime = now()): ParsedBill {
  const amount = extractAmount(raw)
  let rest = amount ? cutSpans(raw, [amount]) : raw
  const paid = PAID.test(rest)
  rest = rest.replace(PAID, ' ')
  const date = extractDate(rest, paid ? 'past' : 'future', reference)
  if (date) rest = cutSpans(rest, [date])
  return {
    provider: cleanLabel(removeWords(rest, NOISE)),
    amountCents: amount?.cents ?? null,
    date: date?.date ?? null,
    paid,
  }
}

/**
 * « facture EDF 84,20 € le 15 », « facture eau 32 € payée » → a bill in
 * Maison; once paid, an expense in Budget.
 */
@inject()
export default class BillIntent implements CaptureIntent {
  info = { name: 'bill', label: 'Facture', domain: 'maison' } as const
  keywords = KEYWORDS

  constructor(
    private aliases: AliasService,
    private budget: BudgetFields,
    private bills: BillService
  ) {}

  score(input: NormalizedInput): number {
    let score = 0
    if (matchedKeywords(input, this.keywords).length > 0) score += 0.7
    if (extractAmount(input.raw)) score += 0.2
    if (score > 0 && PAID.test(input.raw)) score += 0.1
    return Math.min(score, 1)
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }

    const { provider, amountCents, dueOn } = draft.data
    const effects: CaptureEffect[] = [
      {
        domain: 'maison',
        title: `Facture ${provider} · ${formatAmount(amountCents!)}`,
        detail: draft.paid
          ? `Payée le ${formatDate(fromIsoDate(dueOn))}`
          : `À payer avant le ${formatDate(fromIsoDate(dueOn))}`,
      },
    ]
    if (draft.paid) {
      effects.push(
        {
          domain: 'budget',
          title: `Dépense de ${formatAmount(amountCents!)} · Facture ${provider}`,
        },
        ...(await this.budget.effects(draft.budget, amountCents!, dueOn))
      )
    } else {
      effects.push({
        domain: 'budget',
        title: 'La dépense sera enregistrée quand la facture sera marquée payée',
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
    const data = await billValidator.validate(draft.data)

    const bill = await this.bills.create(data, trx, {
      paidOn: draft.paid ? data.dueOn : undefined,
      captureText: input.original,
    })

    if (
      draft.budget.envelopeOverridden &&
      data.envelopeId !== null &&
      data.envelopeId !== draft.budget.matchedEnvelopeId
    ) {
      await this.aliases.learn('envelope', data.envelopeId, data.provider, trx)
    }

    return {
      message: draft.paid
        ? `Facture ${data.provider} payée (${formatAmount(data.amountCents)})`
        : `Facture ${data.provider} enregistrée`,
      created: [{ type: 'bill' as const, id: bill.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseBill(input.raw)

    const provider = pick(overrides, 'provider', parsed.provider, read.text)
    const amount = pick(overrides, 'amountCents', parsed.amountCents, read.cents)
    const status = pick(overrides, 'status', parsed.paid ? 'paid' : 'due', (value) =>
      value === 'paid' ? 'paid' : 'due'
    )
    const dueOn = pick(
      overrides,
      'dueOn',
      isoDate(parsed.date ?? today()),
      (value) => read.isoDate(value) ?? isoDate(today())
    )
    const budget = await this.budget.resolve(normalize(`factures ${provider.value}`), overrides)
    const paid = status.value === 'paid'

    const missing: string[] = []
    if (provider.value === '') missing.push('Fournisseur')
    if (amount.value === null || amount.value <= 0) missing.push('Montant')

    return {
      data: {
        provider: provider.value,
        amountCents: amount.value,
        dueOn: dueOn.value,
        envelopeId: budget.envelopeId,
        accountId: budget.accountId,
      },
      paid,
      budget,
      missing,
      fields: [
        textField('provider', 'Fournisseur', provider.value, provider.overridden),
        amountField(
          'amountCents',
          'Montant',
          amount.value,
          amount.overridden,
          parsed.amountCents !== null
        ),
        selectField(
          'status',
          'Statut',
          status.value,
          [
            { value: 'due', label: 'À payer' },
            { value: 'paid', label: 'Payée' },
          ],
          status.overridden ? 'override' : parsed.paid ? 'parsed' : 'default',
          true
        ),
        dateField(
          'dueOn',
          paid ? 'Payée le' : 'Échéance',
          dueOn.value,
          dueOn.overridden,
          parsed.date !== null
        ),
        ...budget.fields,
      ],
    }
  }
}
