import { useEffect, useRef } from 'react'
import { usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { FileText, LogOut, Newspaper, UserRound, X } from 'lucide-react'
import { ficheNav, reviewNav, type NavItem } from '~/components/ui/nav_items'
import { cn } from '~/lib/cn'
import { ICON_STROKE } from '~/lib/icons'

const ROW =
  'flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-ink'

function SheetLink({ item, url, detail }: { item: NavItem; url: string; detail?: string }) {
  const Icon = item.icon
  const active = item.match(url)
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(ROW, active && 'font-medium')}
    >
      <Icon size={20} strokeWidth={active ? 2 : 1.6} />
      <span className="flex-1">{item.label}</span>
      {detail && <span className="text-label text-muted">{detail}</span>}
    </Link>
  )
}

/**
 * Small screens: everything the bottom bar has no room for, in a sheet
 * that rises from the bottom. Closes on navigation.
 */
export default function MobileMoreSheet({
  open,
  onClose,
  lists,
}: {
  open: boolean
  onClose: () => void
  lists: NavItem
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { url, props } = usePage()
  const routine = props.routine

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    onClose()
    // Close when the page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  const reviewDetail = routine
    ? routine.todayCompleted
      ? `fait · série ${routine.streak} j`
      : routine.due
        ? 'à faire'
        : routine.streak > 0
          ? `série ${routine.streak} j`
          : undefined
    : undefined

  return (
    <dialog
      ref={dialogRef}
      aria-label="Plus"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="mt-auto mb-0 w-full max-w-none rounded-t-2xl border-t border-border bg-bg p-0 text-ink backdrop:bg-ink/30 md:hidden"
    >
      <div className="flex flex-col gap-1 px-3 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Plus</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid size-10 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink"
          >
            <X size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Plus" className="flex flex-col">
          <SheetLink item={lists} url={url} />
          {routine && <SheetLink item={reviewNav} url={url} detail={reviewDetail} />}
          <p className="px-3 pt-3 pb-1 text-label text-muted">Fiches</p>
          {ficheNav.map((item) => (
            <SheetLink key={item.href} item={item} url={url} />
          ))}
        </nav>

        <div aria-hidden="true" className="my-1 h-px bg-border" />
        <Link route="reports.current" className={ROW}>
          <FileText size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Compte rendu du mois
        </Link>
        <Link route="newspapers.current" className={ROW}>
          <Newspaper size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Journal du jour
        </Link>
        <Link route="profile.show" className={ROW}>
          <UserRound size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span className="flex-1">Profil</span>
          <span className="truncate text-label text-muted">
            {props.user?.fullName ?? props.user?.email}
          </span>
        </Link>
        <Form route="session.destroy">
          <button type="submit" className={ROW}>
            <LogOut size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Se déconnecter
          </button>
        </Form>
      </div>
    </dialog>
  )
}
