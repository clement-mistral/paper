import { type ReactNode } from 'react'
import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  ListChecks,
  Printer,
  RefreshCw,
  Rss,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import { urlFor } from '~/client'
import AppShell from '~/layouts/app_shell'
import Button, { buttonClasses } from '~/components/ui/button'
import ProgressBar from '~/components/ui/progress_bar'
import NewspaperDaySwitch from '~/components/domain/newspaper_day_switch'
import { cn } from '~/lib/cn'
import { domainMeta } from '~/lib/domains'
import { formatAmount, formatClock, formatFullDate, shiftDay } from '~/lib/format'
import { ICON_STROKE } from '~/lib/icons'
import type { Domain } from '#shared/types/domain'
import type { FullArticle, NewsItemRow, Newspaper } from '#shared/types/news'

type FrontItem = NewsItemRow & { continuesOn: number | null }
import type { InertiaProps } from '~/types'

/** WMO code → pictogram. */
function WeatherGlyph({ code }: { code: number }) {
  const props = { 'size': 16, 'strokeWidth': 1.6, 'aria-hidden': true } as const
  if (code === 0) return <Sun {...props} />
  if (code <= 2) return <CloudSun {...props} />
  if (code === 3) return <Cloud {...props} />
  if (code === 45 || code === 48) return <CloudFog {...props} />
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow {...props} />
  if (code >= 95) return <CloudLightning {...props} />
  return <CloudRain {...props} />
}

/** « MONDE » above a headline: small caps, letter-spaced. */
function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn('text-[9.5px] font-semibold tracking-[0.18em] text-muted uppercase', className)}
    >
      {children}
    </p>
  )
}

function Meta({ item }: { item: FrontItem }) {
  return (
    <p className="text-[9.5px] tracking-wide text-muted uppercase">
      {item.source} · {formatClock(item.publishedAt)}
      {item.continuesOn !== null && (
        <span className="ml-1.5 font-semibold text-ink normal-case">
          · Suite page {item.continuesOn} →
        </span>
      )}
    </p>
  )
}

/**
 * The lead story: large serif headline, drop cap on the summary.
 */
function Lead({ item }: { item: FrontItem }) {
  return (
    <article className="flex flex-col gap-2">
      <Kicker>{item.section}</Kicker>
      <h2 className="font-serif text-[27px] leading-[1.08] font-bold tracking-tight text-ink">
        {item.title}
      </h2>
      {item.summary && (
        <p className="line-clamp-6 font-serif text-[13px] leading-[1.45] text-ink first-letter:float-left first-letter:mt-[3px] first-letter:mr-1 first-letter:font-serif first-letter:text-[46px] first-letter:leading-[0.8] first-letter:font-bold">
          {item.summary}
        </p>
      )}
      <Meta item={item} />
    </article>
  )
}

function Story({ item, featured = false }: { item: FrontItem; featured?: boolean }) {
  return (
    <article className="mb-2 break-inside-avoid border-b border-border pb-2 last:border-b-0">
      <h3
        className={cn(
          'font-serif leading-[1.15] font-bold text-ink',
          featured ? 'text-[16px]' : 'text-[13.5px]'
        )}
      >
        {item.title}
      </h3>
      {item.summary && (
        <p
          className={cn(
            'mt-1 text-[11px] leading-[1.45] text-ink/85',
            featured ? 'line-clamp-4' : 'line-clamp-3'
          )}
        >
          {item.summary}
        </p>
      )}
      <div className="mt-1">
        <Meta item={item} />
      </div>
    </article>
  )
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-serif text-[20px] leading-none font-bold text-ink tabular-nums">
        {value}
      </span>
      <span className="mt-0.5 text-[9.5px] tracking-wide text-muted uppercase">{label}</span>
    </div>
  )
}

/**
 * « Votre journée » : the household's day and figures, set apart in a
 * tinted box like a newspaper's sidebar.
 */
function DaySidebar({ newspaper }: { newspaper: Newspaper }) {
  const { myDay, figures } = newspaper
  const items = myDay.items.slice(0, 6)
  const budget = figures.budgetLeftCents
  const budgetTotal = budget === null ? null : budget + figures.spentCents
  return (
    <aside className="flex flex-col gap-3 rounded-card bg-callout p-3.5">
      <div className="flex flex-col gap-1.5">
        <Kicker>Votre journée</Kicker>
        {items.length === 0 && myDay.meals.length === 0 ? (
          <p className="font-serif text-[13px] text-muted italic">Une journée libre.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item, index) => (
              <li key={index} className="flex items-baseline gap-2 text-[11.5px] leading-snug">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
                    domainMeta[item.domain as Domain]?.bar ?? 'bg-ink'
                  )}
                />
                <span className="w-9 shrink-0 font-semibold text-ink tabular-nums">
                  {item.time ? item.time.replace(':', 'h') : ''}
                </span>
                <span className="min-w-0 text-ink">{item.title}</span>
              </li>
            ))}
            {myDay.items.length > items.length && (
              <li className="pl-[3.25rem] text-[10.5px] text-muted">
                et {myDay.items.length - items.length} de plus
              </li>
            )}
          </ul>
        )}
        {myDay.meals.length > 0 && (
          <p className="flex items-start gap-2 text-[11.5px] text-ink">
            <UtensilsCrossed
              size={12}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-muted"
            />
            <span>{myDay.meals.join(' · ')}</span>
          </p>
        )}
        {(myDay.overdue > 0 || myDay.streak > 0) && (
          <p className="text-[10.5px] text-muted">
            {[
              myDay.overdue > 0 ? `${myDay.overdue} chose(s) en retard` : null,
              myDay.streak > 0 ? `série de bilans : ${myDay.streak} jour(s)` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <Kicker>Le foyer ce mois-ci</Kicker>
        <div className="grid grid-cols-2 gap-3">
          <Figure value={formatAmount(figures.spentCents)} label="dépensés" />
          {budget !== null ? (
            <Figure value={formatAmount(budget)} label="reste du budget" />
          ) : figures.incomeCents > 0 ? (
            <Figure value={formatAmount(figures.incomeCents)} label="entrés" />
          ) : null}
        </div>
        {budget !== null && budgetTotal !== null && budgetTotal > 0 && (
          <ProgressBar
            value={figures.spentCents / budgetTotal}
            tone={budget < 0 ? 'danger' : 'budget'}
            label="Part du budget dépensée"
          />
        )}
        {figures.meters.length > 0 && (
          <ul className="flex flex-col gap-0.5 pt-1">
            {figures.meters.map((meter) => (
              <li key={meter.label} className="text-[10.5px] leading-snug text-muted">
                <span className="font-medium text-ink">{meter.label}</span> {meter.value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

/**
 * An article printed in full: kicker, headline, then justified paragraphs.
 */
function FullStory({ article }: { article: FullArticle }) {
  return (
    <article className="mb-4 border-b border-border pb-3 last:border-b-0">
      <div className="break-inside-avoid">
        <Kicker>{article.section}</Kicker>
        <h2 className="mt-1 font-serif text-[17px] leading-[1.12] font-bold text-ink">
          {article.title}
        </h2>
        <p className="mt-1 mb-1.5 text-[9.5px] tracking-wide text-muted uppercase">
          {article.source} · {formatClock(article.publishedAt)}
        </p>
      </div>
      {article.paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={cn(
            'text-justify text-[10.5px] leading-[1.45] text-ink [hyphens:auto]',
            index > 0 && 'mt-1.5 indent-3'
          )}
        >
          {paragraph}
        </p>
      ))}
      {article.truncated && (
        <p className="mt-1.5 text-[10px] font-semibold text-ink">
          … Suite sur {article.host ?? 'le site de l’éditeur'}
        </p>
      )}
      {article.restricted && (
        <p className="mt-1 text-[9.5px] text-muted italic">
          Article réservé aux abonnés : seule la partie publique est imprimée.
        </p>
      )}
    </article>
  )
}

const SHEET =
  'flex w-full max-w-[210mm] flex-col bg-bg p-[12mm] text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08),0_8px_24px_rgb(0_0_0/0.06)] print:max-w-none print:p-0 print:shadow-none'

function FullTextPage({
  newspaper,
  page,
}: {
  newspaper: Newspaper
  page: Newspaper['pages'][number]
}) {
  return (
    <section className={cn(SHEET, 'gap-3 print:break-before-page')}>
      <header className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-1">
        <span className="font-serif text-[15px] font-black tracking-tight text-ink">
          {newspaper.title}
        </span>
        <span className="text-[9.5px] tracking-[0.14em] text-muted uppercase">
          {formatFullDate(newspaper.day)} · page {page.number}
        </span>
      </header>
      <div className="columns-1 gap-5 sm:columns-3 print:columns-3 [column-rule:1px_solid_var(--color-border)]">
        {page.articles.map((article) => (
          <FullStory key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

export default function NewspaperShow({
  newspaper,
  today,
}: InertiaProps<{ newspaper: Newspaper; today: string }>) {
  const { weather, ephemeris } = newspaper
  const all = newspaper.sections.flatMap((section) => section.items)
  const lead = all[0] ?? null
  const rest = newspaper.sections
    .map((section) => ({ ...section, items: section.items.filter((item) => item !== lead) }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 print:block print:p-0">
      <Head title={`${newspaper.title} · ${formatFullDate(newspaper.day)}`} />

      <nav
        aria-label="Journal"
        className="flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden"
      >
        <div className="flex flex-wrap items-center gap-1">
          <NewspaperDaySwitch day={newspaper.day} today={today} route="newspapers.show" />
          <Link
            route="newspapers.show"
            routeParams={{ day: shiftDay(newspaper.day, -1) }}
            className={buttonClasses('ghost', 'sm')}
            aria-label="Jour précédent"
          >
            <ChevronLeft size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Link>
          <Link
            route="newspapers.show"
            routeParams={{ day: shiftDay(newspaper.day, 1) }}
            className={buttonClasses('ghost', 'sm')}
            aria-label="Jour suivant"
          >
            <ChevronRight size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Link>
          <Link
            route="newspapers.choice"
            routeParams={{ day: newspaper.day }}
            className={buttonClasses('secondary', 'sm')}
          >
            <ListChecks size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Choisir les articles
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.post(urlFor('newspapers.refresh'), {}, { preserveScroll: true })}
          >
            <RefreshCw size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Actualiser
          </Button>
          <Link route="newspapers.sources" className={buttonClasses('ghost', 'sm')}>
            <Rss size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Sources
          </Link>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Imprimer ou enregistrer en PDF
        </Button>
      </nav>

      <article className={cn(SHEET, 'gap-4')}>
        {/* Masthead ------------------------------------------------------ */}
        <header className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4 text-[9.5px] tracking-[0.14em] text-muted uppercase">
            <span>
              N° {newspaper.issue} · {ephemeris.dayOfYear}
              <span className="normal-case">ᵉ</span> jour
            </span>
            <span>Édition du foyer</span>
            <span>
              Semaine {ephemeris.week} · J−{ephemeris.daysLeft}
            </span>
          </div>
          <h1 className="text-center font-serif text-[44px] leading-none font-black tracking-tight text-ink sm:text-[48px] print:text-[48px]">
            {newspaper.title}
          </h1>
          <div className="border-t-[3px] border-ink" />
          <div className="-mt-1.5 border-t border-ink" />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
            <span className="font-serif text-[13px] font-semibold text-ink">
              {formatFullDate(newspaper.day)}
            </span>
            <span className="text-muted">Saint {ephemeris.saint}</span>
            {weather ? (
              <span className="inline-flex items-center gap-1.5 text-ink">
                <WeatherGlyph code={weather.code} />
                <span>
                  {weather.label}, <strong className="tabular-nums">{weather.minC}°</strong> /{' '}
                  <strong className="tabular-nums">{weather.maxC}°</strong>
                  <span className="text-muted">
                    {' '}
                    à {weather.city}
                    {weather.rainChance !== null && weather.rainChance >= 20
                      ? ` · pluie ${weather.rainChance} %`
                      : ''}
                    {weather.sunrise && weather.sunset
                      ? ` · soleil ${weather.sunrise}–${weather.sunset}`
                      : ''}
                  </span>
                </span>
              </span>
            ) : (
              <span className="text-muted print:hidden">Météo : réglez la ville dans Sources</span>
            )}
          </div>
          <div className="border-t border-ink" />
        </header>

        {/* Front page ---------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] print:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {lead ? (
            <Lead item={lead} />
          ) : (
            <div className="flex flex-col items-start gap-2 py-6 print:hidden">
              <p className="font-serif text-[22px] font-bold text-ink">Pas encore d’articles</p>
              <p className="text-sm text-muted">
                Choisissez les articles du jour : ils prennent place ici.
              </p>
              <Link
                route="newspapers.choice"
                routeParams={{ day: newspaper.day }}
                className={buttonClasses('secondary', 'sm')}
              >
                Choisir les articles
              </Link>
            </div>
          )}
          <DaySidebar newspaper={newspaper} />
        </div>

        {/* Rubriques ----------------------------------------------------- */}
        {rest.length > 0 && (
          <div className="columns-1 gap-5 border-t border-ink pt-2.5 sm:columns-3 print:columns-3 [column-rule:1px_solid_var(--color-border)]">
            {rest.map((section) => (
              <section key={section.name} className="mb-2">
                <Kicker className="mb-2 break-after-avoid border-b border-ink pb-1 text-ink">
                  {section.name}
                </Kicker>
                {section.items.map((item, index) => (
                  <Story key={item.id} item={item} featured={index === 0} />
                ))}
              </section>
            ))}
          </div>
        )}

        {/* Quote and ephemeris ------------------------------------------- */}
        <footer className="mt-auto break-inside-avoid border-t border-ink pt-2.5 text-center">
          <p className="mx-auto max-w-[160mm] font-serif text-[13.5px] leading-snug text-ink">
            <span className="italic">« {ephemeris.quote.text} »</span>
            <span className="ml-2 text-[9.5px] tracking-[0.14em] whitespace-nowrap text-muted uppercase not-italic">
              {ephemeris.quote.author}
            </span>
          </p>
        </footer>
      </article>

      {newspaper.pages.map((page) => (
        <FullTextPage key={page.number} newspaper={newspaper} page={page} />
      ))}
    </div>
  )
}

NewspaperShow.layout = [AppShell]
