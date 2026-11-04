import vine from '@vinejs/vine'
import { MAINTENANCE_KINDS } from '#shared/types/auto'
import { euros } from '#validators/rules'

/**
 * Maintenance forms of the vehicle fiche: the cost is typed in euros, the
 * envelope and the account come from selects.
 */
const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const km = () => vine.number().withoutDecimals().min(0).max(5_000_000)

const budget = {
  envelopeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'envelopes', column: 'id' })
    .optional(),
  accountId: vine.number().withoutDecimals().exists({ table: 'accounts', column: 'id' }).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
}

const common = {
  kind: vine.enum(MAINTENANCE_KINDS),
  label: vine.string().trim().maxLength(120).optional(),
  intervalKm: vine.number().withoutDecimals().min(1).max(1_000_000).optional(),
  intervalMonths: vine.number().withoutDecimals().min(1).max(240).optional(),
  ...budget,
}

const completion = {
  doneOn: isoDate(),
  odometerKm: km().optional(),
  cost: euros().optional(),
  garage: vine.string().trim().maxLength(120).optional(),
}

/**
 * A maintenance noted once done.
 */
export const doneMaintenanceValidator = vine.create({ ...common, ...completion })

/**
 * A maintenance to come: a due date, a due mileage, or both.
 */
export const plannedMaintenanceValidator = vine.create({
  ...common,
  dueOn: isoDate().optional().requiredIfMissing('dueOdometerKm'),
  dueOdometerKm: km().optional(),
})

/**
 * « Marquer fait » on a planned maintenance.
 */
export const completeMaintenanceValidator = vine.create({ ...completion, ...budget })
