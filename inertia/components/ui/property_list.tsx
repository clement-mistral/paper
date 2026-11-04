import { type ReactNode } from 'react'

export type Property = { label: string; value: ReactNode }

/**
 * Label / value rows at the top of a fiche, Notion-style.
 */
export default function PropertyList({ properties }: { properties: Property[] }) {
  return (
    <dl className="flex flex-col">
      {properties.map(({ label, value }) => (
        <div key={label} className="flex min-h-9 flex-wrap items-center gap-x-4 py-1">
          <dt className="w-40 shrink-0 text-label text-muted">{label}</dt>
          <dd className="min-w-0 flex-1 text-sm text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
