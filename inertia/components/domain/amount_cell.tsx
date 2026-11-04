import { cn } from '~/lib/cn'
import { formatAmount } from '~/lib/format'

/**
 * A right-aligned amount. Income is prefixed with « + » and shown in green,
 * expenses stay in ink.
 */
export default function AmountCell({
  cents,
  neutral = false,
  className,
}: {
  cents: number
  /** A transfer leg: signed, but neither income nor expense. */
  neutral?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        cents > 0 && !neutral && 'text-success',
        className
      )}
    >
      {cents > 0 && '+'}
      {formatAmount(cents)}
    </span>
  )
}
