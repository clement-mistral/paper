import { Link } from '@adonisjs/inertia/react'
import { ChevronRight } from 'lucide-react'
import DomainIcon from '~/components/domain/domain_icon'
import { ficheHref, ficheMeta, type FicheType } from '~/lib/fiches'
import { ICON_STROKE } from '~/lib/icons'

/**
 * « Fiches › Comptes » above a fiche title.
 */
export default function FicheBreadcrumb({ type }: { type: FicheType }) {
  const meta = ficheMeta[type]
  return (
    <nav aria-label="Fil d’Ariane" className="flex items-center gap-1.5">
      <DomainIcon icon={meta.icon} domain={meta.domain} size={15} />
      <Link route="fiches.index" className="hover:text-ink hover:underline">
        Fiches
      </Link>
      <ChevronRight size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <Link href={ficheHref(type)} className="hover:text-ink hover:underline">
        {meta.label}
      </Link>
    </nav>
  )
}
