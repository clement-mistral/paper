import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { inject } from '@adonisjs/core'
import Envelope from '#domains/budget/models/envelope'
import AliasService from '#capture/services/alias_service'
import { normalize, normalizePhrases } from '#capture/normalizer'
import { today } from '#support/dates'
import type { EnvelopeDetail, EnvelopeSummary } from '#shared/types/budget'

export type EnvelopeInput = {
  name: string
  monthlyBudget?: number
  keywords?: string
  notes?: string
}

/**
 * Similarity between an envelope name and a text, in both directions:
 * « courses » ↔ « Courses alimentaires », « resto » ↔ « resto avec Paul ».
 */
const SIMILARITY =
  'greatest(word_similarity(unaccent(lower(name)), ?), word_similarity(?, unaccent(lower(name))))'

/**
 * SQL expression of what an envelope spent during the current month, as
 * positive cents (income booked on an envelope reduces it).
 */
function spentThisMonthSql() {
  const start = today().startOf('month').toISODate()
  const end = today().endOf('month').toISODate()
  return db.raw(
    `coalesce((select -sum(t.amount_cents) from transactions t where t.envelope_id = envelopes.id and t.occurred_on between ? and ?), 0)::int as spent_cents`,
    [start, end]
  )
}

/**
 * Public service of the Budget domain for envelopes.
 */
@inject()
export default class EnvelopeService {
  constructor(private aliases: AliasService) {}

  async list(): Promise<EnvelopeSummary[]> {
    const envelopes = await Envelope.query()
      .select('envelopes.*')
      .select(spentThisMonthSql())
      .orderBy('name')
    return envelopes.map((envelope) => this.toSummary(envelope))
  }

  async detail(id: number): Promise<EnvelopeDetail> {
    const envelope = await Envelope.query()
      .select('envelopes.*')
      .select(spentThisMonthSql())
      .where('id', id)
      .firstOrFail()

    const phrases = await this.aliases.manualPhrases('envelope', id)
    return {
      ...this.toSummary(envelope),
      notes: envelope.notes,
      keywords: phrases.filter((phrase) => phrase !== normalize(envelope.name)),
    }
  }

  /**
   * Spent this month on an envelope, for the capture preview.
   */
  async spentThisMonth(id: number): Promise<number> {
    const envelope = await Envelope.query()
      .select('envelopes.id')
      .select(spentThisMonthSql())
      .where('id', id)
      .firstOrFail()
    return Number(envelope.$extras.spent_cents)
  }

  /**
   * Envelope for a normalized text: an alias first (keywords and learned
   * corrections), then the closest name.
   */
  async match(text: string): Promise<Envelope | null> {
    const alias = await this.aliases.findInText('envelope', text)
    if (alias) return Envelope.find(alias.entityId)
    return this.findByName(text)
  }

  /**
   * Best envelope for a normalized text by name similarity (pg_trgm),
   * used when no alias matches.
   */
  async findByName(text: string): Promise<Envelope | null> {
    if (text === '') return null
    return Envelope.query()
      .select('envelopes.*')
      .select(db.raw(`${SIMILARITY} as score`, [text, text]))
      .whereRaw(`${SIMILARITY} >= 0.6`, [text, text])
      .orderBy('score', 'desc')
      .first()
  }

  async create(input: EnvelopeInput): Promise<Envelope> {
    return db.transaction(async (trx) => {
      const envelope = new Envelope().useTransaction(trx)
      this.fill(envelope, input)
      await envelope.save()
      await this.syncKeywords(envelope, input, trx)
      return envelope
    })
  }

  async update(id: number, input: EnvelopeInput): Promise<Envelope> {
    return db.transaction(async (trx) => {
      const envelope = await Envelope.findOrFail(id, { client: trx })
      this.fill(envelope, input)
      await envelope.save()
      await this.syncKeywords(envelope, input, trx)
      return envelope
    })
  }

  async delete(id: number) {
    await db.transaction(async (trx) => {
      const envelope = await Envelope.findOrFail(id, { client: trx })
      await this.aliases.removeFor('envelope', envelope.id, trx)
      await envelope.delete()
    })
  }

  /**
   * The envelope name itself is always a keyword, so « resto 12 € »
   * lands in « Resto » without any configuration.
   */
  private async syncKeywords(
    envelope: Envelope,
    input: EnvelopeInput,
    trx: TransactionClientContract
  ) {
    const phrases = normalizePhrases([input.name, input.keywords ?? ''].join(','))
    await this.aliases.syncManual('envelope', envelope.id, phrases, trx)
  }

  private fill(envelope: Envelope, input: EnvelopeInput) {
    envelope.name = input.name
    envelope.monthlyBudgetCents = input.monthlyBudget ?? 0
    envelope.notes = input.notes ?? null
  }

  private toSummary(envelope: Envelope): EnvelopeSummary {
    return {
      id: envelope.id,
      name: envelope.name,
      monthlyBudgetCents: envelope.monthlyBudgetCents,
      spentCents: Number(envelope.$extras.spent_cents ?? 0),
    }
  }
}
