import { useEffect, useId, useRef, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import MoreIcon from '~/components/icons/more_icon'
import PlusIcon from '~/components/icons/plus_icon'
import MobileMoreSheet from '~/components/ui/mobile_more_sheet'
import {
  ficheNav,
  inMoreSheet,
  mobileNav,
  primaryNav,
  reviewNav,
  type NavItem,
} from '~/components/ui/nav_items'
import { cn } from '~/lib/cn'

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

/**
 * One icon link. The active state is shown by colour and stroke only: no
 * background, no pill.
 */
function RailLink({
  item,
  url,
  title = item.label,
  badge,
  className,
}: {
  item: NavItem
  url: string
  title?: string
  badge?: string
  className?: string
}) {
  const active = item.match(url)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-label={badge ? `${item.label}, ${badge}` : item.label}
      title={title}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative grid place-items-center rounded-md transition-colors',
        active ? 'text-ink' : 'text-muted hover:text-ink',
        FOCUS_RING,
        className
      )}
    >
      <Icon strokeWidth={active ? 2 : 1.6} />
      <span className="sr-only">{item.label}</span>
      {badge && (
        <span
          aria-hidden="true"
          className="absolute top-3 right-3.5 size-2 rounded-full bg-ink ring-2 ring-bg"
        />
      )}
    </Link>
  )
}

/**
 * Avatar at the bottom of the rail: profile and logout.
 */
function AccountMenu() {
  const { props } = usePage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const name = props.user?.fullName ?? props.user?.email ?? ''
  const initial = (props.user?.initials ?? name).charAt(0).toUpperCase()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative mt-auto">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Compte de ${name}`}
        title={name}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'cursor-pointer grid size-9 place-items-center rounded-full bg-hover text-[13px] font-semibold text-ink',
          FOCUS_RING
        )}
      >
        {initial}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute bottom-0 left-full z-40 ml-3 w-56 rounded-card border border-border bg-bg p-1 shadow-lg"
      >
        <p className="truncate px-2.5 py-2 text-label text-muted">{name}</p>
        <Link
          route="profile.show"
          onClick={() => setOpen(false)}
          className="flex h-10 w-full items-center rounded-control px-2.5 text-sm text-ink hover:bg-hover"
        >
          Profil
        </Link>
        <Link
          route="reports.current"
          onClick={() => setOpen(false)}
          className="flex h-10 w-full items-center rounded-control px-2.5 text-sm text-ink hover:bg-hover"
        >
          Compte rendu du mois
        </Link>
        <Link
          route="newspapers.current"
          onClick={() => setOpen(false)}
          className="flex h-10 w-full items-center rounded-control px-2.5 text-sm text-ink hover:bg-hover"
        >
          Journal du jour
        </Link>
        <Form route="session.destroy">
          <button
            type="submit"
            className="cursor-pointer flex h-10 w-full items-center rounded-control px-2.5 text-left text-sm text-ink hover:bg-hover"
          >
            Se déconnecter
          </button>
        </Form>
      </div>
    </div>
  )
}

function reviewBadge(routine: ReturnType<typeof usePage>['props']['routine']): string | undefined {
  if (!routine || routine.todayCompleted || !routine.due) return undefined
  return 'à faire'
}

function reviewTitle(routine: ReturnType<typeof usePage>['props']['routine']): string {
  if (!routine) return reviewNav.label
  const parts = [reviewNav.label]
  if (routine.todayCompleted) parts.push('fait')
  else if (routine.due) parts.push('à faire')
  if (routine.streak > 0) parts.push(`série de ${routine.streak} j`)
  return parts.join(' · ')
}

/**
 * Desktop navigation: an 84px rail of icons, labels only for assistive
 * technologies and as tooltips.
 */
export default function NavRail({ onAdd }: { onAdd: () => void }) {
  const { url, props } = usePage()
  const linkSize = 'h-[52px] w-14'

  return (
    <aside className="sticky top-0 hidden h-dvh w-[84px] shrink-0 flex-col items-center gap-1.5 border-r border-border bg-bg py-4 md:flex print:hidden">
      <Link
        route="today"
        aria-label="Paper, aujourd’hui"
        title="Paper"
        className={cn(
          'mb-[14px] grid size-10 place-items-center rounded-[10px] bg-ink text-[18px] font-bold text-bg',
          FOCUS_RING
        )}
      >
        P
      </Link>

      <button
        type="button"
        onClick={onAdd}
        aria-label="Ajouter"
        title="Ajouter (Ctrl K)"
        aria-keyshortcuts="Control+K Meta+K"
        className={cn(
          'mb-[14px] grid size-12 place-items-center rounded-full border border-ink text-ink transition-colors hover:bg-hover',
          FOCUS_RING
        )}
      >
        <PlusIcon />
      </button>

      <nav aria-label="Navigation principale">
        <ul className="flex flex-col items-center gap-1">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <RailLink item={item} url={url} className={linkSize} />
            </li>
          ))}
          {props.routine && (
            <li>
              <RailLink
                item={reviewNav}
                url={url}
                title={reviewTitle(props.routine)}
                badge={reviewBadge(props.routine)}
                className={linkSize}
              />
            </li>
          )}
        </ul>
      </nav>

      <div aria-hidden="true" className="my-2 h-px w-8 shrink-0 bg-border" />

      <nav aria-label="Fiches">
        <ul className="flex flex-col items-center gap-1">
          {ficheNav.map((item) => (
            <li key={item.href}>
              <RailLink item={item} url={url} className={linkSize} />
            </li>
          ))}
        </ul>
      </nav>

      <AccountMenu />

      {props.appVersion && (
        <Link
          route="changelog"
          title="Nouveautés"
          aria-label={`Version ${props.appVersion}, voir les nouveautés`}
          aria-current={url.startsWith('/nouveautes') ? 'page' : undefined}
          className={cn(
            'mt-1 grid h-10 w-14 place-items-center rounded-md text-[11px] tabular-nums transition-colors',
            url.startsWith('/nouveautes') ? 'text-ink' : 'text-muted hover:text-ink',
            FOCUS_RING
          )}
        >
          v{props.appVersion}
        </Link>
      )}
    </aside>
  )
}

/**
 * Small screens: a bottom bar with three dimensions around « + », and
 * « Plus » for the rest (Listes, Bilan, Fiches, compte rendu, profil).
 */
export function MobileNavBar({ onAdd }: { onAdd: () => void }) {
  const { url, props } = usePage()
  const [moreOpen, setMoreOpen] = useState(false)
  const link = (item: NavItem) => (
    <li key={item.href} className="flex">
      <RailLink item={item} url={url} className="flex-1" />
    </li>
  )
  const moreActive = inMoreSheet(url)
  const reviewDue = props.routine && !props.routine.todayCompleted && props.routine.due

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {mobileNav.start.map(link)}
          <li className="grid place-items-center">
            <button
              type="button"
              onClick={onAdd}
              aria-label="Ajouter"
              title="Ajouter"
              className={cn(
                'grid size-11 place-items-center rounded-full border border-ink text-ink',
                FOCUS_RING
              )}
            >
              <PlusIcon />
            </button>
          </li>
          {mobileNav.end.map(link)}
          <li className="flex">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label={reviewDue ? 'Plus, bilan du jour à faire' : 'Plus'}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'relative grid flex-1 place-items-center rounded-md transition-colors',
                moreActive ? 'text-ink' : 'text-muted hover:text-ink',
                FOCUS_RING
              )}
            >
              <MoreIcon strokeWidth={moreActive ? 2 : 1.6} />
              <span className="sr-only">Plus</span>
              {reviewDue && (
                <span
                  aria-hidden="true"
                  className="absolute top-3 right-[calc(50%-18px)] size-2 rounded-full bg-ink ring-2 ring-bg"
                />
              )}
            </button>
          </li>
        </ul>
      </nav>
      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        lists={mobileNav.inSheet}
      />
    </>
  )
}
