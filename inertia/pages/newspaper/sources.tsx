import { useId } from 'react'
import { router } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button from '~/components/ui/button'
import DataTable from '~/components/ui/data_table'
import EmptyState from '~/components/ui/empty_state'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import StatusTag from '~/components/ui/status_tag'
import { ICON_STROKE } from '~/lib/icons'
import type { NewsSourceRow, NewspaperSettings } from '#shared/types/news'
import { Plus } from 'lucide-react'
import type { InertiaProps } from '~/types'

const DEFAULT_SECTIONS = ['À la une', 'Local', 'Monde', 'Économie', 'Sciences', 'Sport', 'Culture']

function lastFetch(source: NewsSourceRow) {
  if (source.lastError) return <StatusTag status="overdue" label={source.lastError} />
  if (!source.lastFetchedAt) return <span className="text-muted">—</span>
  return (
    <span className="text-muted">
      {new Date(source.lastFetchedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}

type Suggestion = { name: string; url: string; section: string }

export default function NewspaperSources({
  sources,
  settings,
  suggestions,
}: InertiaProps<{
  sources: NewsSourceRow[]
  settings: NewspaperSettings
  suggestions: Suggestion[]
}>) {
  const sectionsId = useId()
  const sections = [...new Set([...sources.map((source) => source.section), ...DEFAULT_SECTIONS])]

  return (
    <Page
      title="Sources du journal"
      description="Les flux RSS ou Atom lus chaque heure ; les articles sont gardés 7 jours."
      breadcrumb={
        <Link route="newspapers.current" className="hover:text-ink hover:underline">
          Journal du jour
        </Link>
      }
      actions={
        sources.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => router.post(urlFor('newspapers.refresh'), {}, { preserveScroll: true })}
          >
            <RefreshCw size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Actualiser maintenant
          </Button>
        )
      }
    >
      <datalist id={sectionsId}>
        {sections.map((section) => (
          <option key={section} value={section} />
        ))}
      </datalist>

      {suggestions.length > 0 && (
        <Section title="Suggestions">
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.url}>
                <button
                  type="button"
                  title={suggestion.url}
                  onClick={() =>
                    router.post(
                      urlFor('newspapers.sources.suggest'),
                      { url: suggestion.url },
                      { preserveScroll: true }
                    )
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border px-3 text-sm text-ink hover:bg-hover"
                >
                  <Plus size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {suggestion.name}
                  <span className="text-label text-muted">· {suggestion.section}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Ajouter une source">
        <Form route="newspapers.sources.store" resetOnSuccess>
          {({ errors, processing }) => (
            <div className="flex flex-col gap-4">
              <Input
                label="Adresse du flux"
                name="url"
                type="url"
                inputMode="url"
                placeholder="https://www.exemple.fr/rss.xml"
                hint="Cherchez « RSS » en bas de page de votre journal ou blog."
                error={errors.url}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Rubrique"
                  name="section"
                  list={sectionsId}
                  defaultValue="À la une"
                  error={errors.section}
                />
                <Input
                  label="Nom"
                  name="name"
                  placeholder="Optionnel : le titre du flux sinon"
                  error={errors.name}
                />
              </div>
              <div>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Lecture du flux…' : 'Ajouter'}
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Section>

      <Section title="Sources suivies">
        <DataTable
          caption="Sources suivies"
          rows={sources}
          rowKey={(source) => source.id}
          columns={[
            {
              key: 'name',
              header: 'Source',
              cell: (source) => (
                <span className="flex flex-col">
                  <span
                    className={source.isActive ? 'font-medium text-ink' : 'text-muted line-through'}
                  >
                    {source.name}
                  </span>
                  <span className="max-w-72 truncate text-label text-muted">{source.url}</span>
                </span>
              ),
            },
            { key: 'section', header: 'Rubrique', cell: (source) => source.section },
            {
              key: 'items',
              header: 'Articles',
              align: 'right',
              cell: (source) => source.itemCount,
            },
            { key: 'fetched', header: 'Dernière lecture', cell: lastFetch },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              cell: (source) => (
                <span className="inline-flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.put(
                        urlFor('newspapers.sources.update', { id: source.id }),
                        { name: source.name, section: source.section, isActive: !source.isActive },
                        { preserveScroll: true }
                      )
                    }
                  >
                    {source.isActive ? 'Suspendre' : 'Reprendre'}
                  </Button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${source.name}`}
                    title="Supprimer"
                    onClick={() => {
                      if (window.confirm(`Ne plus suivre « ${source.name} » ?`)) {
                        router.delete(urlFor('newspapers.sources.destroy', { id: source.id }), {
                          preserveScroll: true,
                        })
                      }
                    }}
                    className="grid size-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-danger"
                  >
                    <Trash2 size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  </button>
                </span>
              ),
            },
          ]}
          empty={<EmptyState title="Aucune source pour l’instant" />}
        />
      </Section>

      <Section title="Réglages de la feuille">
        <Form route="newspapers.settings" options={{ preserveScroll: true }}>
          {({ errors, processing }) => (
            <div className="flex max-w-xl flex-col gap-4">
              <Input
                label="Titre du journal"
                name="title"
                defaultValue={settings.title}
                error={errors.title}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Ville de la météo"
                  name="city"
                  defaultValue={settings.city ?? ''}
                  placeholder="Rennes"
                  hint="Prévisions Open-Meteo (service public, gratuit)."
                  error={errors.city}
                />
                <Input
                  label="Articles présélectionnés par rubrique"
                  name="perSection"
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={settings.perSection}
                  error={errors.perSection}
                />
              </div>
              <div>
                <Button type="submit" variant="secondary" disabled={processing}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Section>
    </Page>
  )
}

NewspaperSources.layout = [AppShell]
