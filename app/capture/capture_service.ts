import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CaptureIntent, CaptureRef } from '#capture/intent'
import CaptureLog from '#capture/models/capture_log'
import { normalize, normalizeInput, type NormalizedInput } from '#capture/normalizer'
import Questions from '#capture/questions'
import { loadIntents } from '#capture/registry'
import { AMBIGUITY_MARGIN, MIN_SCORE } from '#capture/scorer'
import AliasService from '#capture/services/alias_service'
import {
  INTENT_NAMES,
  type CaptureOverrides,
  type CapturePreview,
  type CaptureReceipt,
  type CaptureRequest,
  type IntentInfo,
  type IntentName,
  type IntentPreview,
} from '#shared/types/capture'

/**
 * Score of an intent the user picked before for a similar phrase: high
 * enough to win over the generic guesses.
 */
const LEARNED_SCORE = 0.9

/**
 * Above this score, a question is answered without considering writes.
 */
const QUESTION_THRESHOLD = 0.9

/**
 * Separators of a multiple capture (« plein 38 L 67 € et café 3 € »).
 */
const SEGMENT_SEPARATOR = /\s*(?:;|\n|\bpuis\b|\bet\b)\s*/i

/**
 * Words ignored when remembering which intent a phrase belongs to.
 */
const SIGNATURE_NOISE = new Set([
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
  'demain',
  'aujourd',
  'hui',
  'hier',
  'soir',
  'midi',
  'matin',
  'prochain',
  'prochaine',
  'semaine',
  'mois',
  'le',
  'la',
  'les',
  'l',
  'un',
  'une',
  'des',
  'de',
  'du',
  'd',
  'a',
  'au',
  'aux',
  'pour',
  'et',
  'j',
  'ai',
  'h',
  'eur',
  'euros',
  'e',
])

type Ranked = Array<{ intent: CaptureIntent; score: number }>

type Resolution =
  | { kind: 'intent'; intent: CaptureIntent; best: IntentName | null }
  | { kind: 'question' }
  | { kind: 'unknown' }
  | { kind: 'ambiguous'; candidates: IntentInfo[] }

/**
 * Universal capture pipeline: understand → plan → execute after
 * confirmation. Nothing is written by `preview`.
 */
@inject()
export default class CaptureService {
  constructor(
    private aliases: AliasService,
    private questions: Questions
  ) {}

  async preview(request: CaptureRequest): Promise<CapturePreview> {
    const input = normalizeInput(request.text)
    if (input.text === '') return { status: 'empty' }

    const segments = await this.segments(input)
    if (segments) {
      return {
        status: 'multiple',
        segments: await Promise.all(
          segments.map(async ({ input: part, intent }, index) => {
            const choice = request.segments?.[index]
            return {
              text: part.original,
              preview: await this.intentPreview(
                await this.forcedOr(intent, choice?.intent),
                part,
                choice?.overrides ?? {},
                []
              ),
            }
          })
        ),
      }
    }

    return this.single(input, request.intent, request.overrides ?? {})
  }

  async commit(request: CaptureRequest): Promise<CaptureReceipt> {
    const input = normalizeInput(request.text)
    const segments = await this.segments(input)

    return db.transaction(async (trx) => {
      const created: CaptureRef[] = []
      const intents: IntentName[] = []
      const messages: string[] = []

      if (segments) {
        for (const [index, segment] of segments.entries()) {
          const choice = request.segments?.[index]
          const intent = await this.forcedOr(segment.intent, choice?.intent)
          const result = await intent.commit(segment.input, choice?.overrides ?? {}, trx)
          created.push(...result.created)
          intents.push(intent.info.name)
          messages.push(result.message)
        }
      } else {
        const resolution = await this.resolve(input, request.intent)
        if (resolution.kind !== 'intent') {
          throw new Exception('Saisie non comprise', { status: 422, code: 'E_CAPTURE_UNKNOWN' })
        }
        const result = await resolution.intent.commit(input, request.overrides ?? {}, trx)
        created.push(...result.created)
        intents.push(resolution.intent.info.name)
        messages.push(result.message)

        /**
         * The user switched to another intent: remember it for phrases
         * built on the same words.
         */
        if (request.intent && resolution.best !== request.intent) {
          await this.learnIntent(input, request.intent, trx)
        }
      }

      const log = await CaptureLog.create(
        { text: input.original, intents, created },
        { client: trx }
      )
      const message =
        messages.length > 1
          ? `${messages.length} saisies enregistrées · ${messages.join(' · ')}`
          : messages[0]
      return { id: log.id, message }
    })
  }

  private async single(
    input: NormalizedInput,
    forced: IntentName | undefined,
    overrides: CaptureOverrides
  ): Promise<CapturePreview> {
    const resolution = await this.resolve(input, forced)

    if (resolution.kind === 'question') {
      return {
        status: 'answer',
        intent: this.questions.info,
        answer: await this.questions.answer(input),
        alternatives: await this.alternatives(input, 'question'),
      }
    }
    if (resolution.kind === 'ambiguous') {
      return { status: 'ambiguous', candidates: resolution.candidates }
    }
    if (resolution.kind === 'unknown') {
      return {
        status: 'unknown',
        message:
          'Je n’ai pas compris. Essayez « café 4,50 € », « carbonara jeudi soir », « appeler le plombier demain 14h », « plein 38 L 67 € » ou « combien en resto ce mois ? ».',
        alternatives: await this.alternatives(input, null),
      }
    }

    return this.intentPreview(
      resolution.intent,
      input,
      overrides,
      await this.alternatives(input, resolution.intent.info.name)
    )
  }

  private async intentPreview(
    intent: CaptureIntent,
    input: NormalizedInput,
    overrides: CaptureOverrides,
    alternatives: IntentInfo[]
  ): Promise<IntentPreview> {
    const draft = await intent.preview(input, overrides)
    return { ...draft, alternatives }
  }

  /**
   * Every write intent with its score, best first, learned preferences
   * included.
   */
  private async rank(input: NormalizedInput): Promise<Ranked> {
    const intents = await loadIntents()
    const learned = await this.aliases.findInText('intent', input.text)
    const learnedName = learned ? INTENT_NAMES[learned.entityId] : null

    const scored = await Promise.all(
      intents.map(async (intent) => {
        let score = await intent.score(input)
        if (intent.info.name === learnedName) score = Math.max(score, LEARNED_SCORE)
        return { intent, score }
      })
    )
    return scored.sort((a, b) => b.score - a.score)
  }

  /**
   * Picks the intent. When two intents are too close, the user chooses;
   * a clear question is answered first.
   */
  private async resolve(input: NormalizedInput, forced?: IntentName): Promise<Resolution> {
    if (forced === 'question') return { kind: 'question' }
    const ranked = await this.rank(input)
    const [best, second] = ranked.filter(({ score }) => score >= MIN_SCORE)
    const bestName = best?.intent.info.name ?? null

    if (forced) {
      const choice = ranked.find(({ intent }) => intent.info.name === forced)
      if (choice) return { kind: 'intent', intent: choice.intent, best: bestName }
    }

    const questionScore = this.questions.score(input)
    if (questionScore >= QUESTION_THRESHOLD) return { kind: 'question' }
    if (!best) return questionScore >= MIN_SCORE ? { kind: 'question' } : { kind: 'unknown' }

    if (second && best.score - second.score < AMBIGUITY_MARGIN) {
      return {
        kind: 'ambiguous',
        candidates: ranked
          .filter(({ score }) => score >= MIN_SCORE && best.score - score < AMBIGUITY_MARGIN)
          .map(({ intent }) => intent.info),
      }
    }

    return { kind: 'intent', intent: best.intent, best: bestName }
  }

  /**
   * Splits a sentence into several captures when every part is
   * understood on its own. A list of items for the same intent (« lait
   * et oeufs aux courses ») stays one capture.
   */
  private async segments(
    input: NormalizedInput
  ): Promise<Array<{ input: NormalizedInput; intent: CaptureIntent }> | null> {
    const parts = input.original
      .split(SEGMENT_SEPARATOR)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    if (parts.length < 2) return null

    const resolved: Array<{ input: NormalizedInput; intent: CaptureIntent }> = []
    for (const part of parts) {
      const partInput = normalizeInput(part)
      const resolution = await this.resolve(partInput)
      if (resolution.kind !== 'intent') return null
      resolved.push({ input: partInput, intent: resolution.intent })
    }

    if (resolved.every(({ intent }) => intent.info.name === 'shopping_item')) return null
    return resolved
  }

  private async forcedOr(intent: CaptureIntent, forced?: IntentName): Promise<CaptureIntent> {
    if (!forced || forced === intent.info.name) return intent
    const intents = await loadIntents()
    return intents.find((candidate) => candidate.info.name === forced) ?? intent
  }

  /**
   * Other intents the user can switch to, the most plausible first.
   */
  private async alternatives(
    input: NormalizedInput,
    current: IntentName | null
  ): Promise<IntentInfo[]> {
    const ranked = await this.rank(input)
    const writes = ranked.map(({ intent }) => intent.info).filter((info) => info.name !== current)
    return current === 'question' ? writes : [...writes, this.questions.info]
  }

  /**
   * Remembers « these words mean that intent » (« dentiste » → task).
   */
  private async learnIntent(
    input: NormalizedInput,
    intent: IntentName,
    trx: TransactionClientContract
  ) {
    /**
     * First run of meaningful consecutive words: aliases are matched as a
     * contiguous phrase.
     */
    const meaningful = (word: string) =>
      word.length > 1 && !/\d/.test(word) && !SIGNATURE_NOISE.has(word)
    const tokens = input.text.split(' ')
    const start = tokens.findIndex(meaningful)
    if (start < 0) return
    const words: string[] = []
    for (const token of tokens.slice(start)) {
      if (!meaningful(token) || words.length === 3) break
      words.push(token)
    }
    await this.aliases.learn(
      'intent',
      INTENT_NAMES.indexOf(intent),
      normalize(words.join(' ')),
      trx
    )
  }
}
