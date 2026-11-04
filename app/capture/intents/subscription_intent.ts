import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import BudgetFields from '#capture/budget_fields'
import type { CaptureIntent, IntentDraft } from '#capture/intent'
import { cleanLabel, cutSpans, extractAmount, extractDate, removeWords } from '#capture/extractors'
import { amountField, numberField, pick, read, selectField, textField } from '#capture/fields'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import { matchedKeywords } from '#capture/scorer'
import AliasService from '#capture/services/alias_service'
import { monthlyCost } from '#domains/maison/services/billing_schedule'
import SubscriptionService from '#domains/maison/services/subscription_service'
import { subscriptionValidator } from '#domains/maison/validators/subscription'
import { now, today } from '#support/dates'
import { formatAmount, formatDate, frequencyLabels } from '#support/format'
import type { CaptureOverrides } from '#shared/types/capture'
import type { Frequency } from '#shared/types/maison'

const KEYWORDS = [
  'abonnement',
  'abonnements',
  'abo',
  'mensuel',
  'mensualite',
  'annuel',
  'prelevement',
]

const MONTHLY = /\b(?:par|chaque|tous les|\/)\s*mois\b|\bmensuel(?:le)?s?\b|\/\s*mois/i
const YEARLY = /\b(?:par|chaque|tous les|\/)\s*(?:an|ans|annee)\b|\bannuel(?:le)?s?\b|\/\s*an\b/i

const NOISE = [
  'abonnement',
  'abo',
  'mensuel',
  'mensuelle',
  'annuel',
  'annuelle',
  'prelevement',
  'preleve',
  'par',
  'chaque',
  'tous',
  'les',
  'mois',
  'an',
  'annee',
]

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

export type ParsedSubscription = {
  name: string
  priceCents: number | null
  frequency: Frequency | null
  billingDay: number | null
  billingMonth: number | null
}

/**
 * Pure extraction step of the subscription intent.
 */
export function parseSubscription(raw: string, reference: DateTime = now()): ParsedSubscription {
  const amount = extractAmount(raw)
  let rest = amount ? cutSpans(raw, [amount]) : raw

  let frequency: Frequency | null = null
  if (YEARLY.test(rest)) frequency = 'yearly'
  else if (MONTHLY.test(rest)) frequency = 'monthly'
  rest = rest.replace(YEARLY, ' ').replace(MONTHLY, ' ')

  const date = extractDate(rest, 'future', reference)
  if (date) rest = cutSpans(rest, [date])

  return {
    name: cleanLabel(removeWords(rest, NOISE)),
    priceCents: amount?.cents ?? null,
    frequency,
    billingDay: date?.hasDay ? date.date.day : null,
    billingMonth: date?.hasMonth ? date.date.month : null,
  }
}

/**
 * « netflix 13,49 € par mois le 5 », « abonnement salle de sport 30 € »,
 * « assurance habitation 240 € par an le 12 mars » → a subscription whose
 * debits are recorded automatically in Budget.
 */
@inject()
export default class SubscriptionIntent implements CaptureIntent {
  info = { name: 'subscription', label: 'Abonnement', domain: 'maison' } as const
  keywords = KEYWORDS

  constructor(
    private aliases: AliasService,
    private budget: BudgetFields,
    private subscriptions: SubscriptionService
  ) {}

  score(input: NormalizedInput): number {
    const keyword = matchedKeywords(input, this.keywords).length > 0
    const amount = extractAmount(input.raw) !== null
    /**
     * « tous les mois » without a price nor the word « abonnement » is a
     * recurring task, not a subscription.
     */
    if (!keyword && !amount) return 0
    let score = keyword ? 0.6 : 0
    if (MONTHLY.test(input.raw) || YEARLY.test(input.raw)) score += 0.6
    if (amount) score += 0.2
    return Math.min(score, 1)
  }

  async preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft> {
    const draft = await this.draft(input, overrides)
    if (draft.missing.length > 0) {
      return { status: 'incomplete', intent: this.info, ...draft, effects: [] }
    }

    const { name, priceCents, frequency, billingDay, billingMonth } = draft.data
    const next = this.subscriptions.firstBilling({ frequency, billingDay, billingMonth }, today())
    const schedule =
      frequency === 'yearly'
        ? `Prélevé chaque année le ${billingDay} ${MONTHS[(billingMonth ?? 1) - 1]}`
        : `Prélevé le ${billingDay} de chaque mois`

    return {
      status: 'ready',
      intent: this.info,
      fields: draft.fields,
      missing: [],
      effects: [
        {
          domain: 'maison',
          title: `Abonnement ${name} · ${formatAmount(priceCents!)} / ${frequencyLabels[frequency]}`,
          detail: `${schedule} · prochain prélèvement le ${formatDate(next)}`,
        },
        {
          domain: 'budget',
          title: `Coût : ${formatAmount(monthlyCost(priceCents!, frequency))} par mois, ${formatAmount(frequency === 'yearly' ? priceCents! : priceCents! * 12)} par an`,
          detail: 'Chaque prélèvement sera enregistré automatiquement dans Budget',
        },
      ],
    }
  }

  async commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ) {
    const draft = await this.draft(input, overrides)
    const data = await subscriptionValidator.validate(draft.data)

    const subscription = await this.subscriptions.create(data, trx)

    if (
      draft.budget.envelopeOverridden &&
      data.envelopeId !== null &&
      data.envelopeId !== draft.budget.matchedEnvelopeId
    ) {
      await this.aliases.learn('envelope', data.envelopeId, data.name, trx)
    }

    return {
      message: `Abonnement ${data.name} créé`,
      created: [{ type: 'subscription' as const, id: subscription.id }],
    }
  }

  private async draft(input: NormalizedInput, overrides: CaptureOverrides) {
    const parsed = parseSubscription(input.raw)

    const name = pick(overrides, 'name', parsed.name, read.text)
    const price = pick(overrides, 'priceCents', parsed.priceCents, read.cents)
    const frequency = pick<Frequency>(overrides, 'frequency', parsed.frequency ?? 'monthly', (v) =>
      v === 'yearly' ? 'yearly' : 'monthly'
    )
    const day = pick(overrides, 'billingDay', parsed.billingDay ?? today().day, (value) =>
      Math.min(31, Math.max(1, Math.round(read.number(value) ?? today().day)))
    )
    const month = pick(overrides, 'billingMonth', parsed.billingMonth ?? today().month, (value) =>
      Math.min(12, Math.max(1, Math.round(read.number(value) ?? today().month)))
    )
    const budget = await this.budget.resolve(normalize(`abonnements ${name.value}`), overrides)

    const missing: string[] = []
    if (name.value === '') missing.push('Nom')
    if (price.value === null || price.value <= 0) missing.push('Prix')

    return {
      data: {
        name: name.value,
        priceCents: price.value,
        frequency: frequency.value,
        billingDay: day.value,
        billingMonth: frequency.value === 'yearly' ? month.value : null,
        envelopeId: budget.envelopeId,
        accountId: budget.accountId,
      },
      budget,
      missing,
      fields: [
        textField('name', 'Nom', name.value, name.overridden),
        amountField(
          'priceCents',
          'Prix',
          price.value,
          price.overridden,
          parsed.priceCents !== null
        ),
        selectField(
          'frequency',
          'Fréquence',
          frequency.value,
          [
            { value: 'monthly', label: 'Mensuel' },
            { value: 'yearly', label: 'Annuel' },
          ],
          frequency.overridden ? 'override' : parsed.frequency ? 'parsed' : 'default',
          true
        ),
        numberField('billingDay', 'Jour', day.value, day.overridden, {
          parsed: parsed.billingDay !== null,
          fallback: 'default',
        }),
        ...(frequency.value === 'yearly'
          ? [
              selectField(
                'billingMonth',
                'Mois',
                month.value,
                MONTHS.map((label, index) => ({ value: index + 1, label })),
                month.overridden ? 'override' : parsed.billingMonth ? 'parsed' : 'default',
                true
              ),
            ]
          : []),
        ...budget.fields,
      ],
    }
  }
}
