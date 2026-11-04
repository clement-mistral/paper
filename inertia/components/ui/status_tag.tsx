import { cn } from '~/lib/cn'
import type { Status } from '#shared/types/domain'

const statuses: Record<Status, { label: string; className: string }> = {
  done: { label: 'Fait', className: 'bg-success-soft text-success' },
  planned: { label: 'Planifié', className: 'bg-callout text-ink' },
  upcoming: { label: 'À prévoir', className: 'bg-warning-soft text-warning' },
  overdue: { label: 'En retard', className: 'bg-danger-soft text-danger' },
}

export default function StatusTag({
  status,
  label: customLabel,
  className,
}: {
  status: Status
  label?: string
  className?: string
}) {
  const { label: defaultLabel, className: tone } = statuses[status]
  const label = customLabel ?? defaultLabel
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag px-1.5 py-0.5 text-xs font-medium',
        tone,
        className
      )}
    >
      {label}
    </span>
  )
}
