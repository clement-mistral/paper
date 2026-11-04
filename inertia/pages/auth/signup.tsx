import AuthLayout from '~/layouts/auth'
import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import Button from '~/components/ui/button'
import Input from '~/components/ui/input'

export default function Signup() {
  return (
    <>
      <Head title="Créer un compte" />
      <h1 className="text-2xl font-bold text-ink">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted">Un compte pour tout le foyer.</p>

      <Form route="new_account.store">
        {({ errors, processing }) => (
          <div className="mt-6 flex flex-col gap-4">
            <Input label="Nom" name="fullName" autoComplete="name" error={errors.fullName} />
            <Input
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label="Mot de passe"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="8 caractères minimum."
              error={errors.password}
            />
            <Input
              label="Confirmer le mot de passe"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              error={errors.passwordConfirmation}
            />
            <Button type="submit" disabled={processing} className="mt-2 w-full">
              {processing ? 'Création…' : 'Créer le compte'}
            </Button>
          </div>
        )}
      </Form>

      <p className="mt-6 text-center text-label text-muted">
        Déjà un compte ?{' '}
        <Link route="session.create" className="text-ink underline underline-offset-2">
          Se connecter
        </Link>
      </p>
    </>
  )
}

Signup.layout = [AuthLayout]
