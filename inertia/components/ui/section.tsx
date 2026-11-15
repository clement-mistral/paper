import { type ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { cn } from '~/lib/cn'
import type { Domain } from '#shared/types/domain'

export type SectionTone = Domain | 'accent' | 'warning' | 'danger'

const tones: Record<SectionTone, string> = {
  accent: 'bg-accent',
  budget: 'bg-budget',
  maison: 'bg-maison',
  auto: 'bg-auto',
  menu: 'bg-menu',
  warning: 'bg-warning-bar',
  danger: 'bg-danger',
}

/**
 * A titled group of content within a page. Sections are separated by space,
 * not by cards. `action` renders a discreet link next to the title; `tone`
 * puts a coloured dot before it (a domain, or an alert such as « En retard »).
 */
export default function Section({
  title,
  action,
  tone,
  children,
  className,
}: {
  title: string
  action?: { label: string; href: string }
  tone?: SectionTone
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <header className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          {tone && (
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', tones[tone])} />
          )}
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="text-label text-accent-ink hover:text-accent hover:underline"
          >
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}
