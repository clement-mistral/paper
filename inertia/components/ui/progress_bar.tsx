import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import type { Domain } from '#shared/types/domain'

export type ProgressTone = Domain | 'warning' | 'danger' | 'ink'

const tones: Record<ProgressTone, string> = {
  budget: domainMeta.budget.bar,
  maison: domainMeta.maison.bar,
  auto: domainMeta.auto.bar,
  menu: domainMeta.menu.bar,
  warning: 'bg-warning-bar',
  danger: 'bg-danger',
  ink: 'bg-ink',
}

/**
 * A 3px progress bar. `value` is a ratio between 0 and 1 (clamped).
 */
export default function ProgressBar({
  value,
  tone = 'ink',
  label,
  className,
}: {
  value: number
  tone?: ProgressTone
  label: string
  className?: string
}) {
  const ratio = Math.min(Math.max(value, 0), 1)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className={cn('h-[3px] w-full overflow-hidden rounded-full bg-hover', className)}
    >
      <div
        className={cn('h-full rounded-full', tones[tone])}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
