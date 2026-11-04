import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import type { Domain } from '#shared/types/domain'

export default function DomainTag({ domain, className }: { domain: Domain; className?: string }) {
  const meta = domainMeta[domain]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag px-1.5 py-0.5 text-xs font-medium',
        meta.ink,
        meta.soft,
        className
      )}
    >
      {meta.label}
    </span>
  )
}
