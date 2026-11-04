import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { NormalizedInput } from '#capture/normalizer'
import type {
  CaptureAnswer,
  CaptureOverrides,
  IntentInfo,
  IntentPreview,
} from '#shared/types/capture'

/**
 * Preview produced by an intent; the capture service adds the
 * alternatives the user can switch to.
 */
export type IntentDraft = Omit<IntentPreview, 'alternatives'>

/**
 * Something a capture created, so « Annuler » can remove it.
 */
export type CaptureRef = {
  type:
    | 'transaction'
    | 'meal_plan'
    | 'recipe'
    | 'shopping_item'
    | 'subscription'
    | 'bill'
    | 'fuel_log'
    | 'task'
    | 'transfer'
    | 'maintenance'
    | 'maintenance_completion'
    | 'meter_reading'
  id: number
}

export type CommitResult = { message: string; created: CaptureRef[] }

/**
 * A kind of thing the universal capture understands (an expense, a fuel
 * log…). Each intent is deterministic: keywords and units give a score,
 * extractors and entity matching fill its fields, then it describes its
 * effects before anything is written.
 *
 * The data type of each intent stays internal to its class, so the
 * registry can hold intents of different shapes.
 */
export interface CaptureIntent {
  info: IntentInfo
  keywords: string[]

  /**
   * Between 0 and 1. Below `MIN_SCORE` the intent is ignored. May look up
   * known entities (a recipe name is enough to recognize a meal).
   */
  score(input: NormalizedInput): number | Promise<number>

  /**
   * Extracts the fields, applies the user's corrections and lists the
   * effects. Never writes.
   */
  preview(input: NormalizedInput, overrides: CaptureOverrides): Promise<IntentDraft>

  /**
   * Validates and writes inside the given transaction, learns from the
   * corrections, and returns the confirmation message and what was
   * created.
   */
  commit(
    input: NormalizedInput,
    overrides: CaptureOverrides,
    trx: TransactionClientContract
  ): Promise<CommitResult>
}

/**
 * A question (« combien en resto ce mois ? »): answered, never written.
 */
export interface QuestionHandler {
  info: IntentInfo
  score(input: NormalizedInput): number
  answer(input: NormalizedInput): Promise<CaptureAnswer>
}
