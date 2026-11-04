import { type ReactNode, type TextareaHTMLAttributes, useId } from 'react'
import { cn } from '~/lib/cn'

export default function Textarea({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: ReactNode
  error?: string
}) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={textareaId} className="text-label text-muted">
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={3}
        aria-invalid={error ? true : undefined}
        className={cn(
          'rounded-control border border-border bg-bg px-2.5 py-2 text-sm text-ink placeholder:text-muted/70',
          'transition-colors focus:border-ink focus:outline-none',
          error && 'border-danger'
        )}
        {...props}
      />
      {error ? (
        <p className="text-label text-danger">{error}</p>
      ) : (
        hint && <p className="text-label text-muted">{hint}</p>
      )}
    </div>
  )
}
