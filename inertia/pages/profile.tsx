import { Form } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import Button from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import type { InertiaProps } from '~/types'

export default function Profile({ user }: InertiaProps) {
  return (
    <Page title="Profil" description="Vos informations de connexion.">
      <Section title="Informations">
        <Form route="profile.update" options={{ preserveScroll: true }}>
          {({ errors, processing }) => (
            <div className="flex max-w-xl flex-col gap-5 pt-2">
              <Input
                label="Nom"
                name="fullName"
                autoComplete="name"
                defaultValue={user?.fullName ?? ''}
                error={errors.fullName}
              />
              <Input
                label="E-mail"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user?.email ?? ''}
                error={errors.email}
              />
              <div>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Section>

      <Section title="Mot de passe">
        <Form
          route="profile.password"
          options={{ preserveScroll: true }}
          resetOnSuccess
          resetOnError={['currentPassword', 'password', 'passwordConfirmation']}
        >
          {({ errors, processing }) => (
            <div className="flex max-w-xl flex-col gap-5 pt-2">
              <Input
                label="Mot de passe actuel"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                error={errors.currentPassword}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Nouveau mot de passe"
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
              </div>
              <p className="text-label text-muted">
                Les autres appareils mémorisés devront se reconnecter.
              </p>
              <div>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Modification…' : 'Changer le mot de passe'}
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Section>
    </Page>
  )
}

Profile.layout = [AppShell]
