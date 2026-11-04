import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { RefreshCw } from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button, { buttonClasses } from '~/components/ui/button'
import Callout from '~/components/ui/callout'
import EmptyState from '~/components/ui/empty_state'
import Page from '~/components/ui/page'
import Section from '~/components/ui/section'
import NewspaperDaySwitch from '~/components/domain/newspaper_day_switch'
import { formatClock, formatFullDate } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { NewsChoice } from '#shared/types/news'
import type { InertiaProps } from '~/types'

export default function NewspaperChoice({
  choice,
  hasSources,
  loading,
  today,
}: InertiaProps<{ choice: NewsChoice; hasSources: boolean; loading: boolean; today: string }>) {
  const [picked, setPicked] = useState<number[]>(choice.pickedIds)
  const [saving, setSaving] = useState(false)
  const toggle = (id: number) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  const save = () => {
    setSaving(true)
    router.put(
      urlFor('newspapers.choice.save', { day: choice.day }),
      { itemIds: picked },
      { onFinish: () => setSaving(false) }
    )
  }

  return (
    <Page
      title={choice.day === today ? 'Choisir les articles' : 'Préparer le journal'}
      description={
        <span className="inline-flex flex-wrap items-center gap-3">
          {formatFullDate(choice.day)}
          <NewspaperDaySwitch day={choice.day} today={today} route="newspapers.choice" />
        </span>
      }
      breadcrumb={
        <Link
          route="newspapers.show"
          routeParams={{ day: choice.day }}
          className="hover:text-ink hover:underline"
        >
          Journal du jour
        </Link>
      }
      actions={
        <>
          <Button
            variant="ghost"
            onClick={() => router.post(urlFor('newspapers.refresh'), {}, { preserveScroll: true })}
          >
            <RefreshCw size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Actualiser
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : `Mettre ${picked.length} article(s) au journal`}
          </Button>
        </>
      }
    >
      {loading && (
        <Callout>
          Six sources gratuites ont été ajoutées pour commencer, en sciences, économie et
          technologie (20 Minutes, Science & Vie, franceinfo, 01net), aux articles courts imprimés
          en entier. Leurs articles arrivent :{' '}
          <button
            type="button"
            onClick={() => router.reload()}
            className="underline underline-offset-2"
          >
            recharger
          </button>{' '}
          dans quelques secondes. Gérez-les dans{' '}
          <Link route="newspapers.sources" className="underline underline-offset-2">
            Sources
          </Link>
          .
        </Callout>
      )}
      {!hasSources ? (
        <EmptyState title="Aucune source">
          Ajoutez des flux RSS (journaux, blogs, club local…) dans{' '}
          <Link route="newspapers.sources" className="text-ink underline underline-offset-2">
            Sources
          </Link>
          .
        </EmptyState>
      ) : choice.sections.length === 0 ? (
        <EmptyState title="Pas d’article récent">
          Rien n’a été publié hier ni aujourd’hui par vos sources. Essayez « Actualiser ».
        </EmptyState>
      ) : (
        <>
          {!choice.saved && (
            <Callout>
              Présélection : les articles les plus récents de chaque rubrique
              {choice.day !== today && ', sans ceux déjà imprimés la veille'}. Cochez ou décochez,
              puis mettez-les au journal.
            </Callout>
          )}
          {choice.sections.map((section) => (
            <Section key={section.name} title={section.name}>
              <ul className="flex flex-col">
                {section.items.map((item) => (
                  <li key={item.id} className="border-b border-border">
                    <label className="flex cursor-pointer items-start gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={picked.includes(item.id)}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-ink"
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium text-ink">{item.title}</span>
                        <span className="text-label text-muted">
                          {item.source} · {formatClock(item.publishedAt)}
                        </span>
                        {item.summary && (
                          <span className="line-clamp-2 text-label text-muted">{item.summary}</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              Mettre {picked.length} article(s) au journal
            </Button>
            <Link
              route="newspapers.show"
              routeParams={{ day: choice.day }}
              className={buttonClasses('ghost')}
            >
              Annuler
            </Link>
          </div>
        </>
      )}
    </Page>
  )
}

NewspaperChoice.layout = [AppShell]
