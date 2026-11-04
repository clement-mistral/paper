import ProgressBar from '~/components/ui/progress_bar'
import { formatAmount } from '~/lib/format'
import type { EnvelopeSummary } from '#shared/types/budget'

/**
 * Spent this month against the monthly budget. Orange from 85 %, red once
 * the budget is exceeded.
 */
export default function EnvelopeProgress({ envelope }: { envelope: EnvelopeSummary }) {
  const { spentCents, monthlyBudgetCents } = envelope
  const ratio = monthlyBudgetCents > 0 ? spentCents / monthlyBudgetCents : 0
  const tone = ratio > 1 ? 'danger' : ratio >= 0.85 ? 'warning' : 'budget'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4 text-label">
        <span className="text-ink">{formatAmount(spentCents)}</span>
        <span className="text-muted">
          {monthlyBudgetCents > 0 ? `sur ${formatAmount(monthlyBudgetCents)}` : 'sans budget'}
        </span>
      </div>
      {monthlyBudgetCents > 0 && (
        <ProgressBar
          value={ratio}
          tone={tone}
          label={`${envelope.name} : ${formatAmount(spentCents)} sur ${formatAmount(monthlyBudgetCents)}`}
        />
      )}
    </div>
  )
}
