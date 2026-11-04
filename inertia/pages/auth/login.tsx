import AuthLayout from '~/layouts/auth'
import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import Button from '~/components/ui/button'
import Checkbox from '~/components/ui/checkbox'
import Input from '~/components/ui/input'

export default function Login() {
  return (
    <>
      <Head title="Connexion" />
      <h1 className="text-2xl font-bold text-ink">Connexion</h1>
      <p className="mt-1 text-sm text-muted">Retrouvez votre foyer.</p>

      <Form route="session.store">
        {({ errors, processing }) => (
          <div className="mt-6 flex flex-col gap-4">
            <Input
              label="E-mail"
              name="email"
              type="email"
              autoComplete="username"
              error={errors.email}
            />
            <Input
              label="Mot de passe"
              name="password"
              type="password"
              autoComplete="current-password"
              error={errors.password}
            />
            <Checkbox label="Se souvenir de moi" name="remember" value="true" />
            <Button type="submit" disabled={processing} className="mt-2 w-full">
              {processing ? 'Connexion…' : 'Se connecter'}
            </Button>
          </div>
        )}
      </Form>

      <p className="mt-6 text-center text-label text-muted">
        Pas encore de compte ?{' '}
        <Link route="new_account.create" className="text-ink underline underline-offset-2">
          Créer un compte
        </Link>
      </p>
    </>
  )
}

Login.layout = [AuthLayout]
