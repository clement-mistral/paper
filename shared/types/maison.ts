/**
 * Maison types shared by the server and the client.
 */

import type { Domain, Status } from './domain.js'

export const FREQUENCIES = ['monthly', 'yearly'] as const

export type Frequency = (typeof FREQUENCIES)[number]

export type SubscriptionSummary = {
  id: number
  name: string
  priceCents: number
  frequency: Frequency
  /** Monthly cost, a yearly price divided by 12. */
  monthlyCostCents: number
  nextBillingOn: string
  isActive: boolean
}

export type SubscriptionDetail = SubscriptionSummary & {
  billingDay: number
  billingMonth: number | null
  envelopeId: number | null
  accountId: number | null
  notes: string | null
}

export type BillStatus = 'paid' | 'due' | 'overdue'

export type BillSummary = {
  id: number
  provider: string
  amountCents: number
  dueOn: string
  paidOn: string | null
  status: BillStatus
}

export type BillDetail = BillSummary & {
  envelopeId: number | null
  accountId: number | null
  notes: string | null
}

/**
 * Budget choices offered by Maison and Auto forms (envelope, account).
 */
export type BudgetOptions = {
  envelopes: Array<{ id: number; name: string }>
  accounts: Array<{ id: number; name: string }>
}

/* -------------------------------------------------------------------------
 * Logement: homes, equipment, electrical panel, meters.
 * ---------------------------------------------------------------------- */

export const HOME_KINDS = ['house', 'apartment', 'other'] as const
export type HomeKind = (typeof HOME_KINDS)[number]
export const HOME_KIND_LABELS: Record<HomeKind, string> = {
  house: 'Maison',
  apartment: 'Appartement',
  other: 'Autre',
}

export const OCCUPANCIES = ['owner', 'tenant'] as const
export type Occupancy = (typeof OCCUPANCIES)[number]
export const OCCUPANCY_LABELS: Record<Occupancy, string> = {
  owner: 'Propriétaire',
  tenant: 'Locataire',
}

export const EQUIPMENT_CATEGORIES = [
  'heating',
  'water_heater',
  'ventilation',
  'appliance',
  'electrical',
  'plumbing',
  'outdoor',
  'multimedia',
  'other',
] as const
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]
export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  heating: 'Chauffage',
  water_heater: 'Eau chaude',
  ventilation: 'Ventilation',
  appliance: 'Électroménager',
  electrical: 'Électricité',
  plumbing: 'Plomberie',
  outdoor: 'Extérieur',
  multimedia: 'Multimédia',
  other: 'Autre',
}

export const METER_KINDS = ['electricity', 'water', 'gas'] as const
export type MeterKind = (typeof METER_KINDS)[number]
export const METER_KIND_LABELS: Record<MeterKind, string> = {
  electricity: 'Électricité',
  water: 'Eau',
  gas: 'Gaz',
}
export const METER_UNITS: Record<MeterKind, string> = {
  electricity: 'kWh',
  water: 'm³',
  gas: 'm³',
}

export type HomeSummary = {
  id: number
  name: string
  kind: HomeKind
  occupancy: Occupancy
  address: string | null
  equipmentCount: number
  circuitCount: number
  meterCount: number
}

/** `none` without a warranty date. */
export type WarrantyStatus = 'none' | 'active' | 'expired'

export type EquipmentMaintenanceRow = {
  id: number
  equipmentId: number
  label: string
  doneOn: string | null
  costCents: number | null
  provider: string | null
  dueOn: string | null
  intervalMonths: number | null
  /** Computed: done, planned, upcoming (soon) or overdue. */
  status: Status
}

export type EquipmentMaintenanceDetail = EquipmentMaintenanceRow & {
  equipmentName: string
  homeId: number
  envelopeId: number | null
  accountId: number | null
  notes: string | null
}

/**
 * A planned equipment maintenance, for « Aujourd'hui » and « Agenda ».
 */
export type DueEquipmentMaintenance = EquipmentMaintenanceRow & { equipmentName: string }

export type EquipmentRow = {
  id: number
  homeId: number
  name: string
  category: EquipmentCategory
  brand: string | null
  model: string | null
  room: string | null
  warrantyUntil: string | null
  warrantyStatus: WarrantyStatus
  /** The most urgent planned maintenance. */
  nextMaintenance: EquipmentMaintenanceRow | null
}

export type EquipmentDetail = EquipmentRow & {
  homeName: string
  purchasedOn: string | null
  priceCents: number | null
  notes: string | null
  maintenances: {
    costCents: number
    /** Planned maintenances, the most urgent first. */
    planned: EquipmentMaintenanceRow[]
    /** Done maintenances, the most recent first. */
    history: EquipmentMaintenanceRow[]
  }
}

export type CircuitRow = {
  id: number
  homeId: number
  reference: string
  label: string
  breakerAmps: number | null
  differential: string | null
  sectionMm2: number | null
  rooms: string | null
  powerWatts: number | null
  notes: string | null
}

export type ReadingRow = {
  id: number
  readOn: string
  value: number
  /** Since the previous reading, null for the first one. */
  consumption: number | null
  days: number | null
  perDay: number | null
}

export type MeterRow = {
  id: number
  homeId: number
  kind: MeterKind
  label: string
  number: string | null
  unit: string
  /** The latest reading, with its consumption since the previous one. */
  lastReading: ReadingRow | null
}

export type MeterDetail = MeterRow & {
  homeName: string
  notes: string | null
  /** Most recent first. */
  readings: ReadingRow[]
}

export type HomeDetail = HomeSummary & {
  surfaceM2: number | null
  builtYear: number | null
  notes: string | null
  equipment: EquipmentRow[]
  circuits: CircuitRow[]
  meters: MeterRow[]
  /** Projects not done nor abandoned, then the others. */
  projects: ProjectRow[]
  claims: ClaimRow[]
}

/* -------------------------------------------------------------------------
 * Contracts, home projects (travaux), insurance claims.
 * ---------------------------------------------------------------------- */

export const CONTRACT_CATEGORIES = [
  'energy',
  'internet_phone',
  'insurance',
  'health',
  'water',
  'bank',
  'other',
] as const
export type ContractCategory = (typeof CONTRACT_CATEGORIES)[number]
export const CONTRACT_CATEGORY_LABELS: Record<ContractCategory, string> = {
  energy: 'Énergie',
  internet_phone: 'Internet et téléphone',
  insurance: 'Assurance',
  health: 'Santé',
  water: 'Eau',
  bank: 'Banque',
  other: 'Autre',
}

export type ContractRow = {
  id: number
  name: string
  category: ContractCategory
  domain: Domain
  provider: string | null
  /** End of the current term (commitment or tacit renewal), null without. */
  termEndsOn: string | null
  /** Last day to give notice before the term ends. */
  noticeBy: string | null
  /** Computed: ended, or how close the notice deadline is. */
  status: Status
  ended: boolean
  subscription: { id: number; name: string; monthlyCostCents: number } | null
}

export type ContractDetail = ContractRow & {
  customerNumber: string | null
  contractNumber: string | null
  contact: string | null
  startedOn: string | null
  commitmentUntil: string | null
  tacitRenewal: boolean
  renewalMonths: number | null
  noticeDays: number | null
  endedOn: string | null
  subscriptionId: number | null
  notes: string | null
  claims: ClaimRow[]
}

export const PROJECT_STATUSES = ['idea', 'planned', 'in_progress', 'done', 'abandoned'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idée',
  planned: 'Prévu',
  in_progress: 'En cours',
  done: 'Terminé',
  abandoned: 'Abandonné',
}

export type ProjectRow = {
  id: number
  title: string
  status: ProjectStatus
  room: string | null
  budgetCents: number | null
  spentCents: number
  targetOn: string | null
  itemCount: number
  itemDoneCount: number
}

export type ProjectExpense = {
  id: number
  label: string
  amountCents: number
  occurredOn: string
}

export type ProjectDetail = ProjectRow & {
  homeId: number
  startsOn: string | null
  doneOn: string | null
  envelopeId: number | null
  accountId: number | null
  notes: string | null
  items: Array<{ id: number; label: string; done: boolean }>
  /** Most recent first, amounts positive. */
  expenses: ProjectExpense[]
}

export const CLAIM_STATUSES = [
  'to_declare',
  'declared',
  'assessment',
  'compensated',
  'refused',
  'closed',
] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  to_declare: 'À déclarer',
  declared: 'Déclaré',
  assessment: 'Expertise',
  compensated: 'Indemnisé',
  refused: 'Refusé',
  closed: 'Clos',
}
/** Claims still being handled. */
export const OPEN_CLAIM_STATUSES: readonly ClaimStatus[] = ['to_declare', 'declared', 'assessment']

export type ClaimRow = {
  id: number
  title: string
  occurredOn: string
  status: ClaimStatus
  insurer: string | null
  damageCents: number | null
  compensationCents: number | null
}

export type ClaimDetail = ClaimRow & {
  homeId: number
  contractId: number | null
  contract: { id: number; name: string } | null
  declaredOn: string | null
  claimNumber: string | null
  deductibleCents: number | null
  compensatedOn: string | null
  notes: string | null
}

/**
 * A household chore: a recurring Maison task with a room.
 */
export type ChoreRow = {
  id: number
  title: string
  room: string | null
  recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  recurrenceInterval: number
  dueOn: string | null
  overdue: boolean
  lastDoneOn: string | null
}

export type ChoreSuggestion = {
  key: string
  title: string
  room: string | null
  recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurrenceInterval: number
}
