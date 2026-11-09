import { useEffect, useState } from 'react'
import { Form } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import Checkbox from '~/components/ui/checkbox'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import { formatDate } from '~/lib/format'
import { disablePush, enablePush, needsInstall, pushState, type PushState } from '~/lib/push'
import type { NotificationsPanel } from '#shared/types/notifications'
import type { InertiaProps } from '~/types'

export default function Profile({
  user,
  notifications,
}: InertiaProps<{ notifications: NotificationsPanel }>) {
  return (
    <Page title="Profil" description="Vos informations de connexion et les rappels du bilan.">
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

      <Notifications panel={notifications} />
    </Page>
  )
}

const DEVICE_STATE: Record<PushState, string> = {
  enabled: 'Activées sur cet appareil.',
  disabled: 'Désactivées sur cet appareil.',
  denied: 'Bloquées par le navigateur : autorisez-les dans les réglages du site.',
  unsupported: 'Ce navigateur ne permet pas les notifications.',
}

/**
 * The daily review reminders: this device's subscription, the other
 * devices, and when to remind.
 */
function Notifications({ panel }: { panel: NotificationsPanel }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    pushState()
      .then(setState)
      .catch(() => setState('unsupported'))
  }, [])

  async function toggle() {
    if (!panel.publicKey) return
    setBusy(true)
    try {
      const next = state === 'enabled' ? await disablePush() : await enablePush(panel.publicKey)
      setState(next)
      if (next === 'denied') toast.error('Notifications refusées par le navigateur')
      router.reload({ only: ['notifications'] })
    } catch {
      toast.error('Impossible de changer les notifications sur cet appareil')
    } finally {
      setBusy(false)
    }
  }

  if (!panel.configured) {
    return (
      <Section title="Notifications">
        <Callout title="Notifications non configurées">
          Le serveur n’a pas de clé d’envoi : générez-la avec <code>node ace push:keys</code> et
          ajoutez <code>VAPID_PRIVATE_KEY</code> à son environnement.
        </Callout>
      </Section>
    )
  }

  const { reminders } = panel
  return (
    <Section title="Notifications">
      <div className="flex max-w-xl flex-col gap-6 pt-2">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink">
            Un rappel le soir tant que le bilan du jour n’est pas validé.
          </p>
          {state === 'unsupported' && needsInstall() ? (
            <Callout title="Installez Paper sur l’écran d’accueil">
              Sur iPhone et iPad, les notifications ne sont disponibles que dans l’application
              installée (Partager, puis « Sur l’écran d’accueil »).
            </Callout>
          ) : (
            state && <p className="text-label text-muted">{DEVICE_STATE[state]}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {(state === 'enabled' || state === 'disabled') && (
              <Button
                variant={state === 'enabled' ? 'secondary' : 'primary'}
                disabled={busy}
                onClick={toggle}
              >
                {state === 'enabled' ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
              </Button>
            )}
            {panel.devices.length > 0 && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  router.post(urlFor('notifications.test'), {}, { preserveScroll: true })
                }
              >
                Envoyer un test
              </Button>
            )}
          </div>
        </div>

        {panel.devices.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-label text-muted">Appareils qui reçoivent les rappels</p>
            <ul className="divide-y divide-border border-y border-border">
              {panel.devices.map((device) => (
                <li key={device.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 text-sm text-ink">
                    {device.label}
                    <span className="text-label text-muted">
                      {' '}
                      · depuis le {formatDate(device.createdAt)}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.delete(urlFor('notifications.devices.destroy', { id: device.id }), {
                        preserveScroll: true,
                        onSuccess: () => pushState().then(setState),
                      })
                    }
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Form route="notifications.reminders" options={{ preserveScroll: true }}>
          {({ errors, processing }) => (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Checkbox
                  strike={false}
                  label="Rappel du bilan du soir"
                  name="eveningEnabled"
                  value="true"
                  defaultChecked={reminders.eveningEnabled}
                />
                <Input
                  className="max-w-40"
                  label="Heure du rappel"
                  name="eveningTime"
                  type="time"
                  required
                  defaultValue={reminders.eveningTime}
                  error={errors.eveningTime}
                />
              </div>
              <Checkbox
                strike={false}
                label="Rappel à 10 h si le bilan de la veille n’est pas fait (avant midi)"
                name="morningEnabled"
                value="true"
                defaultChecked={reminders.morningEnabled}
              />
              <div>
                <Button type="submit" variant="secondary" disabled={processing}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </Form>
      </div>
    </Section>
  )
}

Profile.layout = [AppShell]
