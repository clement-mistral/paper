import { type ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { cn } from '~/lib/cn'

/**
 * A titled group of content within a page. Sections are separated by space,
 * not by cards. `action` renders a discreet link next to the title.
 */
export default function Section({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: { label: string; href: string }
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <header className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action && (
          <Link href={action.href} className="text-label text-muted hover:text-ink hover:underline">
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}
