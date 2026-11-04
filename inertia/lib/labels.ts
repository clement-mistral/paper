import type { Fuel } from '#shared/types/auto'
export { MAINTENANCE_KIND_LABELS as maintenanceKindLabels } from '#shared/types/auto'
import type { BillStatus, Frequency } from '#shared/types/maison'
export {
  CLAIM_STATUS_LABELS as claimStatusLabels,
  CONTRACT_CATEGORY_LABELS as contractCategoryLabels,
  PROJECT_STATUS_LABELS as projectStatusLabels,
  EQUIPMENT_CATEGORY_LABELS as equipmentCategoryLabels,
  HOME_KIND_LABELS as homeKindLabels,
  METER_KIND_LABELS as meterKindLabels,
  OCCUPANCY_LABELS as occupancyLabels,
} from '#shared/types/maison'
import type { MealSlot, Unit } from '#shared/types/menu'
import type { Status } from '#shared/types/domain'

export const unitLabels: Record<Unit, string> = {
  piece: 'pièce(s)',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  cl: 'cl',
  l: 'L',
  cas: 'c. à s.',
  cac: 'c. à c.',
  pincee: 'pincée(s)',
  tranche: 'tranche(s)',
}

export const fuelLabels: Record<Fuel, string> = {
  sp95: 'SP95',
  sp98: 'SP98',
  e10: 'SP95-E10',
  e85: 'E85',
  diesel: 'Gazole',
  lpg: 'GPL',
  electric: 'Électrique',
}

export const frequencyLabels: Record<Frequency, string> = {
  monthly: 'Mensuel',
  yearly: 'Annuel',
}

export const slotLabels: Record<MealSlot, string> = {
  lunch: 'Midi',
  dinner: 'Soir',
}

export const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/**
 * Bills reuse the generic status tag.
 */
export const billStatus: Record<BillStatus, Status> = {
  paid: 'done',
  due: 'planned',
  overdue: 'overdue',
}

const RECURRENCE_UNITS = {
  daily: { unit: 'jours', feminine: false },
  weekly: { unit: 'semaines', feminine: true },
  monthly: { unit: 'mois', feminine: false },
  yearly: { unit: 'ans', feminine: false },
} as const

/**
 * « Toutes les semaines », « Toutes les 2 semaines », « Tous les 3 mois ».
 */
export function recurrenceLabel(
  recurrence: keyof typeof RECURRENCE_UNITS,
  interval: number
): string {
  const { unit, feminine } = RECURRENCE_UNITS[recurrence]
  const every = feminine ? 'Toutes les' : 'Tous les'
  return interval <= 1 ? `${every} ${unit}` : `${every} ${interval} ${unit}`
}
