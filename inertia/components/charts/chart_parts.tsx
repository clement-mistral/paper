import { type ReactNode } from 'react'
import { cn } from '~/lib/cn'

/**
 * The hover / focus readout: the value leads, the label follows. A short
 * stroke of the series colour keys line charts.
 */
export function ChartTooltip({
  x,
  y,
  width,
  value,
  label,
  lineKey,
}: {
  x: number
  y: number
  width: number
  value: string
  label: string
  lineKey?: string
}) {
  const left = Math.min(Math.max(x, 70), width - 70)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-control border border-border bg-bg px-2.5 py-1.5 whitespace-nowrap shadow-sm"
      style={{ left, top: Math.max(y - 10, 0) }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink tabular-nums">
        {lineKey && <span className={cn('h-0.5 w-3 rounded-full', lineKey)} />}
        {value}
      </p>
      <p className="text-label text-muted">{label}</p>
    </div>
  )
}

/**
 * The same values as a table, folded: nothing is reachable only by hover.
 */
export function ChartTable({
  caption,
  header,
  rows,
}: {
  caption: string
  header: [string, string]
  rows: Array<{ key: string; label: string; value: string }>
}) {
  return (
    <details className="group text-label text-muted">
      <summary className="w-fit cursor-pointer rounded-control hover:text-ink">
        Voir les données
      </summary>
      <div className="mt-2 max-h-72 overflow-auto">
        <table className="w-full max-w-md border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="h-8 text-left font-normal text-muted">
                {header[0]}
              </th>
              <th scope="col" className="h-8 text-right font-normal text-muted">
                {header[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border">
                <td className="h-8 text-ink">{row.label}</td>
                <td className="h-8 text-right text-ink tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

/**
 * Keyboard-reachable frame of a chart; announces the active point.
 */
export function ChartFrame({
  title,
  announce,
  onKeyDown,
  onBlur,
  children,
  frameRef,
}: {
  title: string
  announce: string
  onKeyDown: (event: React.KeyboardEvent) => void
  onBlur: () => void
  children: ReactNode
  frameRef: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={frameRef}
      role="group"
      tabIndex={0}
      aria-label={`${title}. Flèches gauche et droite pour parcourir les valeurs.`}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="relative w-full rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      {children}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}
