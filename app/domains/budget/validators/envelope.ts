import vine from '@vinejs/vine'
import { euros } from '#validators/rules'

export const envelopeValidator = vine.create({
  name: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(80)
    .unique({
      table: 'envelopes',
      column: 'name',
      caseInsensitive: true,
      filter: (query, _, field) => {
        if (field.meta.envelopeId) query.whereNot('id', field.meta.envelopeId)
      },
    }),
  monthlyBudget: euros().optional(),
  /**
   * Comma-separated words that route a captured expense to this envelope
   * (« resto, restaurant, mcdo »).
   */
  keywords: vine.string().trim().maxLength(500).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
