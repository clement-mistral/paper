import { type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export default function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-tag border border-border bg-bg px-1 font-sans text-[11px] text-muted',
        className
      )}
    >
      {children}
    </kbd>
  )
}
