import { Link } from '@adonisjs/inertia/react'
import { ChevronRight } from 'lucide-react'
import { ICON_STROKE } from '~/lib/icons'

/**
 * « Comptes › Compte courant », above the pages of an account.
 */
export default function AccountBreadcrumb({ account }: { account: { id: number; name: string } }) {
  return (
    <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1.5">
      <Link route="accounts.index" className="hover:text-ink hover:underline">
        Comptes
      </Link>
      <ChevronRight size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <Link
        route="accounts.show"
        routeParams={{ id: account.id }}
        className="hover:text-ink hover:underline"
      >
        {account.name}
      </Link>
    </nav>
  )
}
