import type { Domain } from './domain.js'

/**
 * Contract of the universal capture endpoints, shared by the server
 * (`app/capture`) and the command palette.
 */

export const INTENT_NAMES = [
  'expense',
  'meal',
  'subscription',
  'shopping_item',
  'bill',
  'fuel',
  'task',
  'question',
  /**
   * Appended, never inserted: learned intent aliases store the index in
   * this list.
   */
  'income',
  'transfer',
  'maintenance',
  'meter_reading',
  'project_expense',
] as const

export type IntentName = (typeof INTENT_NAMES)[number]

export type IntentInfo = { name: IntentName; label: string; domain: Domain }

export type CaptureFieldKind = 'amount' | 'text' | 'date' | 'number' | 'select'

/**
 * Where a field value comes from, shown as a hint in the preview.
 */
export type CaptureFieldSource = 'parsed' | 'matched' | 'default' | 'override' | 'empty'

export type CaptureField = {
  key: string
  label: string
  kind: CaptureFieldKind
  /** Raw value sent back as an override: cents, ISO date, id or text. */
  value: string | number | null
  /** Human readable value (« 4,50 € », « 02/11/2026 »…). */
  display: string
  source: CaptureFieldSource
  required: boolean
  options?: Array<{ value: number | string | null; label: string }>
  /** Unit shown after a number field (« L », « km », « pers. »). */
  suffix?: string
}

export type CaptureEffect = {
  domain: Domain
  title: string
  detail?: string
  tone?: 'default' | 'warning'
}

export type CaptureOverrides = Record<string, string | number | null>

/**
 * Preview of one intent. `alternatives` are the other intents the user
 * can switch to (« Ce n'est pas ça ? »).
 */
export type IntentPreview = {
  status: 'ready' | 'incomplete'
  intent: IntentInfo
  fields: CaptureField[]
  missing: string[]
  effects: CaptureEffect[]
  alternatives: IntentInfo[]
}

/**
 * Read-only answer to a question (« combien en resto ce mois ? »).
 */
export type CaptureAnswer = {
  title: string
  lines: Array<{ label: string; value: string; domain?: Domain }>
  empty?: string
  link?: { label: string; href: string }
}

export type CapturePreview =
  | { status: 'empty' }
  | { status: 'unknown'; message: string; alternatives: IntentInfo[] }
  | { status: 'ambiguous'; candidates: IntentInfo[] }
  | IntentPreview
  | { status: 'answer'; intent: IntentInfo; answer: CaptureAnswer; alternatives: IntentInfo[] }
  /**
   * Several captures in one sentence (« plein 38 L 67 € et café 3 € »).
   */
  | { status: 'multiple'; segments: Array<{ text: string; preview: IntentPreview }> }

export type CaptureRequest = {
  text: string
  intent?: IntentName
  overrides?: CaptureOverrides
  /**
   * Per segment choices of a multiple capture, by position.
   */
  segments?: Array<{ intent?: IntentName; overrides?: CaptureOverrides }>
}

/**
 * Flashed after a commit, so the toast can offer « Annuler ».
 */
export type CaptureReceipt = { id: number; message: string }
