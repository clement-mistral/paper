import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import AuthLayout from '~/layouts/auth'
import { buttonClasses } from '~/components/ui/button'

export default function NotFound() {
  return (
    <div className="text-center">
      <Head title="Page introuvable" />
      <p className="text-label text-muted">404</p>
      <h1 className="mt-1 text-2xl font-bold text-ink">Page introuvable</h1>
      <p className="mt-2 text-sm text-muted">Cette page n’existe pas ou a été déplacée.</p>
      <Link route="today" className={`${buttonClasses('secondary')} mt-6`}>
        Retour à Aujourd’hui
      </Link>
    </div>
  )
}

NotFound.layout = [AuthLayout]
