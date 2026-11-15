import { Link } from '@adonisjs/inertia/react'
import { cn } from '~/lib/cn'

export type StatTone = 'accent' | 'danger' | 'menu' | 'budget' | 'success'

/** Literal classes, for Tailwind to see them. */
const tones: Record<StatTone, { box: string; value: string }> = {
  accent: { box: 'bg-accent-soft hover:ring-accent/30', value: 'text-accent-ink' },
  danger: { box: 'bg-danger-soft hover:ring-danger/30', value: 'text-danger' },
  menu: { box: 'bg-menu-soft hover:ring-menu/30', value: 'text-menu-ink' },
  budget: { box: 'bg-budget-soft hover:ring-budget/30', value: 'text-budget-ink' },
  success: { box: 'bg-success-soft hover:ring-success/30', value: 'text-success' },
}

/**
 * A figure at a glance, on its colour, leading to the page behind it.
 */
export default function StatTile({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: string
  href: string
  tone: StatTone
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-card px-3.5 py-3 ring-1 ring-transparent transition-shadow',
        tones[tone].box
      )}
    >
      <span className={cn('text-xl font-semibold tabular-nums', tones[tone].value)}>{value}</span>
      <span className="truncate text-label text-ink/70">{label}</span>
    </Link>
  )
}
