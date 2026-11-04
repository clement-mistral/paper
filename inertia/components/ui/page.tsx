import { type ReactNode } from 'react'
import { Head } from '@inertiajs/react'

/**
 * The frame of a page: document title, optional breadcrumb, 36px heading,
 * optional description and right-aligned actions.
 */
export default function Page({
  title,
  breadcrumb,
  description,
  actions,
  children,
}: {
  title: string
  breadcrumb?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 pt-10 pb-16 sm:px-12 sm:pt-16">
      <Head title={title} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {breadcrumb && <div className="mb-3 text-label text-muted">{breadcrumb}</div>}
          <h1 className="text-page font-bold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
