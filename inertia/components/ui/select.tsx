import { type ReactNode, type SelectHTMLAttributes, useId } from 'react'
import { cn } from '~/lib/cn'

export default function Select({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className="text-label text-muted">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-9 rounded-control border border-border bg-bg px-2 text-sm text-ink',
          'transition-colors focus:border-ink focus:outline-none',
          error && 'border-danger'
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-label text-danger">{error}</p>
      ) : (
        hint && <p className="text-label text-muted">{hint}</p>
      )}
    </div>
  )
}
