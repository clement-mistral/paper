import AuthLayout from '~/layouts/auth'
import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import Button from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Input from '~/components/ui/input'
import type { InertiaProps } from '~/types'

/**
 * Joining the household from the link a member sent.
 */
export default function Invitation({
  token,
  invitedBy,
}: InertiaProps<{ token: string; invitedBy: string | null }>) {
  if (!invitedBy) {
    return (
      <>
        <Head title="Invitation expirée" />
        <h1 className="text-2xl font-bold text-ink">Invitation expirée</h1>
        <Callout className="mt-6" title="Ce lien n’est plus valable">
          Il a déjà servi ou date de plus de 7 jours. Demandez un nouveau lien à un membre du foyer
          (Profil → Foyer).
        </Callout>
        <p className="mt-6 text-center text-label text-muted">
          Déjà un compte ?{' '}
          <Link route="session.create" className="text-ink underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      </>
    )
  }

  return (
    <>
      <Head title="Rejoindre le foyer" />
      <h1 className="text-2xl font-bold text-ink">Rejoindre le foyer</h1>
      <p className="mt-1 text-sm text-muted">
        {invitedBy} vous invite sur Paper : vous partagerez l’agenda, l’argent, les listes et les
        fiches. Votre bilan du jour et vos notifications restent les vôtres.
      </p>

      <Form route="invitations.accept" routeParams={{ token }}>
        {({ errors, processing }) => (
          <div className="mt-6 flex flex-col gap-4">
            <Input
              label="Nom"
              name="fullName"
              autoComplete="name"
              required
              error={errors.fullName}
            />
            <Input
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              required
              error={errors.email}
            />
            <Input
              label="Mot de passe"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="8 caractères minimum."
              required
              error={errors.password}
            />
            <Input
              label="Confirmer le mot de passe"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              required
              error={errors.passwordConfirmation}
            />
            <Button type="submit" disabled={processing} className="mt-2 w-full">
              {processing ? 'Création…' : 'Créer mon compte'}
            </Button>
          </div>
        )}
      </Form>
    </>
  )
}

Invitation.layout = [AuthLayout]
