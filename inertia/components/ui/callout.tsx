import { type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export default function Callout({
  icon,
  title,
  children,
  className,
}: {
  icon?: ReactNode
  title?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex gap-3 rounded-card bg-callout px-4 py-3', className)}>
      {icon && <div className="mt-0.5 shrink-0 text-muted">{icon}</div>}
      <div className="min-w-0 text-sm">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className={cn('text-ink', title && 'mt-0.5 text-muted')}>{children}</div>}
      </div>
    </div>
  )
}
