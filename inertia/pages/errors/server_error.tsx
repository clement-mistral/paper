import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import AuthLayout from '~/layouts/auth'
import { buttonClasses } from '~/components/ui/button'

export default function ServerError() {
  return (
    <div className="text-center">
      <Head title="Erreur" />
      <p className="text-label text-muted">500</p>
      <h1 className="mt-1 text-2xl font-bold text-ink">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-muted">Réessayez dans un instant.</p>
      <Link route="today" className={`${buttonClasses('secondary')} mt-6`}>
        Retour à Aujourd’hui
      </Link>
    </div>
  )
}

ServerError.layout = [AuthLayout]
