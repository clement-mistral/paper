import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cn } from '~/lib/cn'

/**
 * A labelled text field. The label is always rendered (pass `hideLabel`
 * to keep it for screen readers only).
 */
export default function Input({
  label,
  hint,
  error,
  hideLabel = false,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  error?: string
  hideLabel?: boolean
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cn('text-label text-muted', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-9 rounded-control border border-border bg-bg px-2.5 text-sm text-ink placeholder:text-muted/70',
          'transition-colors focus:border-ink focus:outline-none',
          error && 'border-danger'
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-label text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-label text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
