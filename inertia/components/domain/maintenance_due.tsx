import { formatDate, formatKm } from '~/lib/format'
import type { MaintenanceRow } from '#shared/types/auto'

/**
 * « 12/03/2027 ou 157 000 km » : the due date and/or mileage of a planned
 * maintenance.
 */
export function maintenanceDue(row: Pick<MaintenanceRow, 'dueOn' | 'dueOdometerKm'>): string {
  const parts = [
    row.dueOn ? formatDate(row.dueOn) : null,
    row.dueOdometerKm !== null ? formatKm(row.dueOdometerKm) : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' ou ') : '—'
}

/**
 * « tous les 15 000 km ou 12 mois », or null without interval.
 */
export function maintenanceInterval(
  row: Pick<MaintenanceRow, 'intervalKm' | 'intervalMonths'>
): string | null {
  const parts = [
    row.intervalKm ? formatKm(row.intervalKm) : null,
    row.intervalMonths ? `${row.intervalMonths} mois` : null,
  ].filter(Boolean)
  return parts.length > 0 ? `tous les ${parts.join(' ou ')}` : null
}
