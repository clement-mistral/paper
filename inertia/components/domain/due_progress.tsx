import ProgressBar from '~/components/ui/progress_bar'
import type { Domain } from '#shared/types/domain'

/**
 * Progress towards a due date or mileage (vidange, contrôle technique…).
 * Turns orange from 85 % and red once the deadline is passed.
 */
export default function DueProgress({
  label,
  detail,
  ratio,
  domain,
}: {
  label: string
  detail: string
  ratio: number
  domain: Domain
}) {
  const tone = ratio >= 1 ? 'danger' : ratio >= 0.85 ? 'warning' : domain
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink">{label}</span>
        <span className="text-label whitespace-nowrap text-muted">{detail}</span>
      </div>
      <ProgressBar value={ratio} tone={tone} label={label} />
    </div>
  )
}
