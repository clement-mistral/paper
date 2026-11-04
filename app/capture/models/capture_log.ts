import { CaptureLogSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { CaptureRef } from '#capture/intent'
import type { IntentName } from '#shared/types/capture'

/**
 * Journal of committed captures, so the last one can be undone.
 */
export default class CaptureLog extends CaptureLogSchema {
  @column()
  declare intents: IntentName[]

  @column({ prepare: (value: CaptureRef[]) => JSON.stringify(value) })
  declare created: CaptureRef[]
}
