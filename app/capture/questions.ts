import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { QuestionHandler } from '#capture/intent'
import { extractDate, removeWords } from '#capture/extractors'
import { normalize, type NormalizedInput } from '#capture/normalizer'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import BillService from '#domains/maison/services/bill_service'
import SubscriptionService from '#domains/maison/services/subscription_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import ShoppingService from '#domains/lists/services/shopping_service'
import AgendaView from '#views/agenda_view'
import MoneyView from '#views/money_view'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import { formatAmount, formatDate, formatKm, formatLongDate, formatNumber } from '#support/format'
import type { CaptureAnswer } from '#shared/types/capture'

const QUESTION_START =
  /^(?:combien|quand|quel|quelle|quels|quelles|qu est ce|est ce|c est quoi|on mange quoi|quoi|ou en|liste|montre|affiche|il reste)\b/

export type Period = { start: DateTime; end: DateTime; label: string }

const MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
]

/**
 * Period of a spending question; the current month by default.
 */
export function parsePeriod(text: string, reference: DateTime = today()): Period {
  const day = reference.startOf('day')
  if (/\baujourd hui\b/.test(text)) return { start: day, end: day, label: "aujourd'hui" }
  if (/\bhier\b/.test(text)) {
    const yesterday = day.minus({ days: 1 })
    return { start: yesterday, end: yesterday, label: 'hier' }
  }
  if (/\bsemaine derniere\b/.test(text)) {
    const start = day.minus({ weeks: 1 }).startOf('week')
    return { start, end: start.endOf('week').startOf('day'), label: 'la semaine dernière' }
  }
  if (/\b(?:cette )?semaine\b/.test(text)) {
    return { start: day.startOf('week'), end: day, label: 'cette semaine' }
  }
  if (/\bmois dernier\b/.test(text)) {
    const start = day.minus({ months: 1 }).startOf('month')
    return { start, end: start.endOf('month').startOf('day'), label: 'le mois dernier' }
  }
  if (/\bannee derniere\b/.test(text)) {
    const start = day.minus({ years: 1 }).startOf('year')
    return { start, end: start.endOf('year').startOf('day'), label: 'l’année dernière' }
  }
  if (/\b(?:cette )?annee\b|\bdepuis janvier\b/.test(text)) {
    return { start: day.startOf('year'), end: day, label: 'cette année' }
  }
  const month = MONTHS.findIndex((name) => new RegExp(`\\b${name}\\b`).test(text))
  if (month >= 0) {
    let start = day.set({ month: month + 1 }).startOf('month')
    if (start > day) start = start.minus({ years: 1 })
    return { start, end: start.endOf('month').startOf('day'), label: `en ${MONTHS[month]}` }
  }
  return { start: day.startOf('month'), end: day, label: 'ce mois-ci' }
}

/**
 * Words removed before looking for the envelope a question is about.
 */
const QUESTION_WORDS = [
  'combien',
  'j',
  'ai',
  'on',
  'a',
  'depense',
  'depenses',
  'depensé',
  'en',
  'au',
  'aux',
  'pour',
  'de',
  'des',
  'du',
  'le',
  'la',
  'les',
  'l',
  'ce',
  'cette',
  'mois',
  'semaine',
  'annee',
  'dernier',
  'derniere',
  'il',
  'reste',
  'me',
  'nous',
  'aujourd',
  'hui',
  'hier',
  'depuis',
  'qu',
  'est',
  'quoi',
  ...MONTHS,
]

type Topic = {
  test: RegExp
  answer: (input: NormalizedInput) => Promise<CaptureAnswer>
}

/**
 * Read-only answers to questions about the household. Deterministic:
 * a topic is recognized by its words, never guessed.
 */
@inject()
export default class Questions implements QuestionHandler {
  info = { name: 'question', label: 'Question', domain: 'budget' } as const

  private topics: Topic[]

  constructor(
    private money: MoneyView,
    private envelopes: EnvelopeService,
    private accounts: AccountService,
    private meals: MealPlanService,
    private subscriptions: SubscriptionService,
    private bills: BillService,
    private agenda: AgendaView,
    private vehicles: VehicleService,
    private shopping: ShoppingService
  ) {
    this.topics = [
      {
        test: /\b(?:il reste|reste[- ]t[- ]il|reste a depenser)\b/,
        answer: (i) => this.remaining(i),
      },
      {
        test: /\b(?:solde|sur le compte|sur mes comptes|patrimoine)\b/,
        answer: () => this.balance(),
      },
      { test: /\b(?:mange|manger|repas|menu|diner|dejeuner)\b/, answer: (i) => this.mealsFor(i) },
      {
        test: /\b(?:preleve|prelevement|prelevements|abonnement|abonnements)\b/,
        answer: (i) => this.debits(i),
      },
      { test: /\b(?:facture|factures|dois payer|a payer)\b/, answer: () => this.unpaidBills() },
      {
        test: /\b(?:a faire|taches?|faire aujourd hui|faire demain|programme)\b/,
        answer: (i) => this.todo(i),
      },
      {
        test: /\b(?:conso|consommation|kilometrage|compteur|cout au km|km)\b/,
        answer: (i) => this.vehicle(i),
      },
      { test: /\b(?:acheter|courses|liste de courses)\b/, answer: () => this.shoppingList() },
      { test: /\b(?:combien|depense|depenses|depensé)\b/, answer: (i) => this.spending(i) },
    ]
  }

  /**
   * Only phrases written as questions; very confident when a topic is
   * recognized, so a question never triggers a write.
   */
  score(input: NormalizedInput): number {
    const asked = input.raw.trim().endsWith('?') || QUESTION_START.test(input.text)
    if (!asked) return 0
    return this.topics.some((topic) => topic.test.test(input.text)) ? 0.95 : 0.6
  }

  async answer(input: NormalizedInput): Promise<CaptureAnswer> {
    const topic = this.topics.find((candidate) => candidate.test.test(input.text))
    if (!topic) {
      return {
        title: 'Je ne sais pas encore répondre à ça',
        lines: [],
        empty:
          'Essayez « combien en resto ce mois ? », « on mange quoi ce soir ? », « prochains prélèvements ? », « factures à payer ? » ou « qu’est-ce que j’ai à faire demain ? ».',
      }
    }
    return topic.answer(input)
  }

  private async spending(input: NormalizedInput): Promise<CaptureAnswer> {
    const period = parsePeriod(input.text)
    const subject = removeWords(input.text, QUESTION_WORDS).trim()
    const envelope = subject ? await this.envelopes.match(subject) : null
    const start = toIsoDate(period.start)
    const end = toIsoDate(period.end)

    if (envelope) {
      const detail = await this.envelopes.detail(envelope.id)
      const { totalCents } = await this.money.spending(start, end, { envelopeId: envelope.id })
      const lines: CaptureAnswer['lines'] = [
        { label: 'Dépensé', value: formatAmount(totalCents), domain: 'budget' },
      ]
      if (detail.monthlyBudgetCents > 0 && period.label === 'ce mois-ci') {
        lines.push(
          { label: 'Budget', value: formatAmount(detail.monthlyBudgetCents) },
          { label: 'Reste', value: formatAmount(detail.monthlyBudgetCents - totalCents) }
        )
      }
      return {
        title: `${envelope.name} · ${period.label}`,
        lines,
        link: { label: 'Voir l’enveloppe', href: urlFor('envelopes.show', { id: envelope.id }) },
      }
    }

    const word = subject.split(' ').find((candidate) => candidate.length >= 3)
    const result = await this.money.spending(start, end, { word })
    return {
      title: word ? `Dépenses « ${word} » · ${period.label}` : `Dépenses · ${period.label}`,
      lines: [
        { label: 'Total', value: formatAmount(result.totalCents), domain: 'budget' as const },
        ...result.byEnvelope.slice(0, 6).map((row) => ({
          label: row.name,
          value: formatAmount(row.totalCents),
        })),
      ],
      empty: result.totalCents === 0 ? 'Aucune dépense sur la période.' : undefined,
      link: { label: 'Voir Argent', href: urlFor('money') },
    }
  }

  private async remaining(input: NormalizedInput): Promise<CaptureAnswer> {
    const subject = removeWords(input.text, QUESTION_WORDS).trim()
    const envelope = subject ? await this.envelopes.match(subject) : null
    if (envelope) {
      const detail = await this.envelopes.detail(envelope.id)
      return {
        title: `${detail.name} · ce mois-ci`,
        lines:
          detail.monthlyBudgetCents > 0
            ? [
                {
                  label: 'Reste',
                  value: formatAmount(detail.monthlyBudgetCents - detail.spentCents),
                  domain: 'budget',
                },
                {
                  label: 'Dépensé',
                  value: `${formatAmount(detail.spentCents)} sur ${formatAmount(detail.monthlyBudgetCents)}`,
                },
              ]
            : [{ label: 'Dépensé', value: formatAmount(detail.spentCents), domain: 'budget' }],
        empty: detail.monthlyBudgetCents > 0 ? undefined : 'Cette enveloppe n’a pas de budget.',
        link: { label: 'Voir l’enveloppe', href: urlFor('envelopes.show', { id: detail.id }) },
      }
    }

    const envelopes = await this.envelopes.list()
    const budgeted = envelopes.filter((e) => e.monthlyBudgetCents > 0)
    return {
      title: 'Reste à dépenser · ce mois-ci',
      lines: budgeted.map((e) => ({
        label: e.name,
        value: formatAmount(e.monthlyBudgetCents - e.spentCents),
      })),
      empty: budgeted.length === 0 ? 'Aucune enveloppe n’a de budget mensuel.' : undefined,
      link: { label: 'Voir Argent', href: urlFor('money') },
    }
  }

  private async balance(): Promise<CaptureAnswer> {
    const accounts = await this.accounts.list()
    const total = accounts.reduce((sum, account) => sum + account.balanceCents, 0)
    return {
      title: 'Soldes',
      lines: [
        ...accounts.map((account) => ({
          label: account.name,
          value: formatAmount(account.balanceCents),
        })),
        ...(accounts.length > 1
          ? [{ label: 'Total', value: formatAmount(total), domain: 'budget' as const }]
          : []),
      ],
      empty: accounts.length === 0 ? 'Aucun compte.' : undefined,
      link: { label: 'Voir les comptes', href: urlFor('accounts.index') },
    }
  }

  private async mealsFor(input: NormalizedInput): Promise<CaptureAnswer> {
    const week = /\bsemaine\b/.test(input.text)
    const date = extractDate(input.raw, 'future')?.date ?? today()
    const start = week ? today() : date
    const end = week ? today().plus({ days: 6 }) : date
    const slot = /\b(?:soir|diner)\b/.test(input.text)
      ? 'dinner'
      : /\b(?:midi|dejeuner)\b/.test(input.text)
        ? 'lunch'
        : null

    const planned = await this.meals.between(toIsoDate(start), toIsoDate(end))
    const meals = planned.filter((meal) => !slot || meal.slot === slot)
    return {
      title: week ? 'Repas de la semaine' : `Au menu · ${formatLongDate(date).toLowerCase()}`,
      lines: meals.map((meal) => ({
        label: `${week ? `${formatLongDate(fromIsoDate(meal.plannedOn))}, ` : ''}${meal.slot === 'lunch' ? 'midi' : 'soir'}`,
        value: `${meal.recipe.name} (${meal.servings} pers.)`,
        domain: 'menu' as const,
      })),
      empty: 'Rien de prévu. Planifiez avec « carbonara jeudi soir ».',
      link: { label: 'Voir l’agenda', href: urlFor('agenda') },
    }
  }

  private async debits(input: NormalizedInput): Promise<CaptureAnswer> {
    const occurrences = await this.subscriptions.occurrences(today(), today().plus({ days: 60 }))
    const subject = removeWords(input.text, [
      ...QUESTION_WORDS,
      'prochain',
      'prochains',
      'preleve',
      'prelevement',
      'prelevements',
      'abonnement',
      'abonnements',
      'mes',
      'est',
    ]).trim()
    const named = subject
      ? occurrences.filter(({ subscription }) => normalize(subscription.name).includes(subject))
      : []
    const shown = (named.length > 0 ? named : occurrences).slice(0, 8)
    return {
      title:
        named.length > 0 ? `Prélèvements ${named[0].subscription.name}` : 'Prochains prélèvements',
      lines: shown.map(({ subscription, date }) => ({
        label: `${formatDate(date)} · ${subscription.name}`,
        value: formatAmount(subscription.priceCents),
        domain: 'maison' as const,
      })),
      empty: 'Aucun prélèvement dans les 60 prochains jours.',
      link: { label: 'Voir les abonnements', href: urlFor('subscriptions.index') },
    }
  }

  private async unpaidBills(): Promise<CaptureAnswer> {
    const bills = await this.bills.unpaid()
    const total = bills.reduce((sum, bill) => sum + bill.amountCents, 0)
    return {
      title: bills.length > 0 ? `Factures à payer · ${formatAmount(total)}` : 'Factures à payer',
      lines: bills.map((bill) => ({
        label: `${bill.provider} · ${bill.status === 'overdue' ? 'en retard' : `avant le ${formatDate(fromIsoDate(bill.dueOn))}`}`,
        value: formatAmount(bill.amountCents),
        domain: 'maison' as const,
      })),
      empty: 'Tout est payé.',
      link: { label: 'Voir les factures', href: urlFor('bills.index') },
    }
  }

  private async todo(input: NormalizedInput): Promise<CaptureAnswer> {
    const date = extractDate(input.raw, 'future')?.date
    if (date && !date.hasSame(today(), 'day')) {
      const items = await this.agenda.items(date, date)
      return {
        title: `À faire · ${formatLongDate(date).toLowerCase()}`,
        lines: items.map((item) => ({
          label: item.time ? `${item.time.replace(':', 'h')} · ${item.title}` : item.title,
          value: item.detail ?? '',
          domain: item.domain,
        })),
        empty: 'Rien de prévu ce jour-là.',
        link: { label: 'Voir l’agenda', href: urlFor('agenda') },
      }
    }

    const overview = await this.agenda.today()
    const lines = [
      ...overview.overdue.map((item) => ({
        label: `En retard · ${item.title}`,
        value: item.detail ?? '',
        domain: item.domain,
      })),
      ...overview.today.map((item) => ({
        label: item.time ? `${item.time.replace(':', 'h')} · ${item.title}` : item.title,
        value: item.detail ?? '',
        domain: item.domain,
      })),
    ]
    return {
      title: 'Aujourd’hui',
      lines,
      empty: 'Rien à faire aujourd’hui.',
      link: { label: 'Voir Aujourd’hui', href: urlFor('today') },
    }
  }

  private async vehicle(input: NormalizedInput): Promise<CaptureAnswer> {
    const named = await this.vehicles.match(input.text)
    const vehicles = await this.vehicles.list()
    const target = named ?? (vehicles.length > 0 ? { id: vehicles[0].id } : null)
    if (!target) return { title: 'Véhicules', lines: [], empty: 'Aucun véhicule.' }

    const vehicle = await this.vehicles.detail(target.id)
    return {
      title: vehicle.name,
      lines: [
        { label: 'Compteur', value: formatKm(vehicle.odometerKm), domain: 'auto' },
        {
          label: 'Consommation',
          value:
            vehicle.litersPer100Km === null
              ? '—'
              : `${formatNumber(vehicle.litersPer100Km)} L/100 km`,
        },
        {
          label: 'Coût au km',
          value:
            vehicle.costPerKmCents === null
              ? '—'
              : `${formatNumber(vehicle.costPerKmCents / 100)} €`,
        },
        { label: 'Carburant dépensé', value: formatAmount(vehicle.fuelCostCents) },
      ],
      link: { label: 'Voir le véhicule', href: urlFor('vehicles.show', { id: vehicle.id }) },
    }
  }

  private async shoppingList(): Promise<CaptureAnswer> {
    const list = await this.shopping.list()
    const items = list.filter((item) => !item.checked)
    return {
      title: `Courses · ${items.length} article${items.length > 1 ? 's' : ''}`,
      lines: items.slice(0, 12).map((item) => ({
        label: item.label,
        value: item.reason ?? '',
        domain: item.reasonDomain ?? undefined,
      })),
      empty: 'La liste est vide.',
      link: { label: 'Voir les listes', href: urlFor('lists') },
    }
  }
}
