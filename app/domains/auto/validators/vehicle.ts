import vine from '@vinejs/vine'
import { FUELS } from '#shared/types/auto'
import { euros } from '#validators/rules'

export const vehicleValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  plate: vine.string().trim().maxLength(20).optional(),
  fuel: vine.enum(FUELS),
  initialOdometerKm: vine.number().withoutDecimals().min(0).max(5_000_000).optional(),
  estimatedValue: euros().optional(),
  keywords: vine.string().trim().maxLength(500).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
