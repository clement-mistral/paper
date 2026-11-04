import { type Key, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

/**
 * A plain table separated by thin rules. Wide tables scroll horizontally
 * inside their own container, never the page.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => Key
  caption?: string
  empty?: ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-9 px-2 text-label font-normal whitespace-nowrap text-muted first:pl-0 last:pr-0',
                  column.align === 'right' ? 'text-right' : 'text-left'
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border hover:bg-callout">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'h-10 px-2 first:pl-0 last:pr-0',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
