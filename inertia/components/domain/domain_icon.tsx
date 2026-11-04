import { type LucideIcon } from 'lucide-react'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { ICON_STROKE } from '~/lib/icons'
import type { Domain } from '#shared/types/domain'

/**
 * An icon tinted with its domain colour, the only place colour appears
 * besides tags and progress bars.
 */
export default function DomainIcon({
  icon: Icon,
  domain,
  size = 16,
  className,
}: {
  icon: LucideIcon
  domain: Domain
  size?: number
  className?: string
}) {
  return (
    <Icon
      size={size}
      strokeWidth={ICON_STROKE}
      aria-hidden="true"
      className={cn('shrink-0', domainMeta[domain].text, className)}
    />
  )
}
