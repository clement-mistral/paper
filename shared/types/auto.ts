/**
 * Auto types shared by the server and the client.
 */

import type { Status } from './domain.js'

export const FUELS = ['sp95', 'sp98', 'e10', 'e85', 'diesel', 'lpg', 'electric'] as const

export type Fuel = (typeof FUELS)[number]

export type VehicleSummary = {
  id: number
  name: string
  plate: string | null
  fuel: Fuel
  odometerKm: number
}

export type FuelLogRow = {
  id: number
  filledOn: string
  liters: number
  totalCents: number
  pricePerLiterCents: number
  odometerKm: number | null
  /**
   * Consumption of this fill-up (full-tank method: its liters over the
   * distance since the previous reading), null without two readings.
   */
  litersPer100Km: number | null
}

export const MAINTENANCE_KINDS = [
  'oil_change',
  'service',
  'tires',
  'brakes',
  'timing_belt',
  'inspection',
  'battery',
  'repair',
  'other',
] as const

export type MaintenanceKind = (typeof MAINTENANCE_KINDS)[number]

/**
 * Shown by the client and used by the server in expense labels and agenda
 * items.
 */
export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  oil_change: 'Vidange',
  service: 'Révision',
  tires: 'Pneus',
  brakes: 'Freins',
  timing_belt: 'Distribution',
  inspection: 'Contrôle technique',
  battery: 'Batterie',
  repair: 'Réparation',
  other: 'Autre',
}

export type MaintenanceRow = {
  id: number
  vehicleId: number
  kind: MaintenanceKind
  label: string | null
  /** Label when given, else the kind (« Vidange »). */
  title: string
  doneOn: string | null
  odometerKm: number | null
  costCents: number | null
  garage: string | null
  dueOn: string | null
  dueOdometerKm: number | null
  intervalKm: number | null
  intervalMonths: number | null
  /** Computed: done, planned, upcoming (soon) or overdue. */
  status: Status
}

export type MaintenanceDetail = MaintenanceRow & {
  vehicleName: string
  /** Current odometer of the vehicle, to suggest the reading. */
  vehicleOdometerKm: number
  envelopeId: number | null
  accountId: number | null
  notes: string | null
}

/**
 * A planned maintenance with its vehicle, for « Aujourd'hui » and « Agenda ».
 */
export type DueMaintenance = MaintenanceRow & { vehicleName: string }

export type VehicleDetail = VehicleSummary & {
  initialOdometerKm: number
  estimatedValueCents: number | null
  notes: string | null
  keywords: string[]
  fuelCostCents: number
  /** Fuel cost per km over the logged distance, in cents. */
  costPerKmCents: number | null
  /** Average consumption over the logged distance. */
  litersPer100Km: number | null
  fuelLogs: FuelLogRow[]
}

/**
 * The maintenance log of a vehicle fiche.
 */
export type VehicleMaintenances = {
  costCents: number
  /** Planned maintenances, the most urgent first. */
  planned: MaintenanceRow[]
  /** Done maintenances, the most recent first. */
  history: MaintenanceRow[]
}
