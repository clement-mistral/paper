import StatusTag from '~/components/ui/status_tag'
import { formatDate } from '~/lib/format'
import type { EquipmentRow } from '#shared/types/maison'

/**
 * « Sous garantie » until the warranty date, then « Garantie expirée ».
 */
export default function WarrantyTag({
  equipment,
  withDate = false,
}: {
  equipment: Pick<EquipmentRow, 'warrantyStatus' | 'warrantyUntil'>
  withDate?: boolean
}) {
  if (equipment.warrantyStatus === 'none' || !equipment.warrantyUntil) {
    return <span className="text-muted">—</span>
  }
  const date = withDate ? ` jusqu’au ${formatDate(equipment.warrantyUntil)}` : ''
  return equipment.warrantyStatus === 'active' ? (
    <StatusTag status="done" label={`Sous garantie${date}`} />
  ) : (
    <StatusTag
      status="planned"
      label={withDate ? `Expirée le ${formatDate(equipment.warrantyUntil)}` : 'Garantie expirée'}
    />
  )
}
