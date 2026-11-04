import vine from '@vinejs/vine'
import { EQUIPMENT_CATEGORIES, HOME_KINDS, METER_KINDS, OCCUPANCIES } from '#shared/types/maison'
import { decimal, euros } from '#validators/rules'

/**
 * Forms of the « Logement » fiche: amounts are typed in euros, decimals
 * in French (« 2,5 »).
 */
const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const text = (max: number) => vine.string().trim().maxLength(max).optional()
const notes = () => vine.string().trim().maxLength(2000).optional()
const envelopeId = () =>
  vine.number().withoutDecimals().exists({ table: 'envelopes', column: 'id' }).optional()
const accountId = () =>
  vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).optional()

export const homeValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  kind: vine.enum(HOME_KINDS),
  occupancy: vine.enum(OCCUPANCIES),
  address: text(500),
  surfaceM2: decimal().optional(),
  builtYear: vine.number().withoutDecimals().min(1000).max(2200).optional(),
  notes: notes(),
})

export const equipmentValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  category: vine.enum(EQUIPMENT_CATEGORIES),
  brand: text(80),
  model: text(80),
  room: text(80),
  purchasedOn: isoDate().optional(),
  price: euros().optional(),
  warrantyUntil: isoDate().optional(),
  notes: notes(),
})

const maintenanceCommon = {
  label: vine.string().trim().minLength(1).maxLength(120),
  intervalMonths: vine.number().withoutDecimals().min(1).max(240).optional(),
  envelopeId: envelopeId(),
  accountId: accountId(),
  notes: notes(),
}

const maintenanceCompletion = {
  doneOn: isoDate(),
  cost: euros().optional(),
  provider: text(120),
}

export const doneEquipmentMaintenanceValidator = vine.create({
  ...maintenanceCommon,
  ...maintenanceCompletion,
})

export const plannedEquipmentMaintenanceValidator = vine.create({
  ...maintenanceCommon,
  dueOn: isoDate(),
})

export const completeEquipmentMaintenanceValidator = vine.create({
  ...maintenanceCompletion,
  envelopeId: envelopeId(),
  accountId: accountId(),
  notes: notes(),
})

export const circuitValidator = vine.create({
  reference: vine.string().trim().minLength(1).maxLength(12),
  label: vine.string().trim().minLength(1).maxLength(80),
  breakerAmps: vine.number().withoutDecimals().min(1).max(500).optional(),
  differential: text(40),
  sectionMm2: decimal().optional(),
  rooms: text(200),
  powerWatts: vine.number().withoutDecimals().min(0).max(100_000).optional(),
  notes: notes(),
})

export const meterValidator = vine.create({
  kind: vine.enum(METER_KINDS),
  label: vine.string().trim().minLength(1).maxLength(80),
  number: text(40),
  notes: notes(),
})

export const readingValidator = vine.create({
  readOn: isoDate(),
  value: decimal(),
})
