import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cn } from '~/lib/cn'

/**
 * `strike` (default) crosses the label out when checked, as in a list;
 * pass `strike={false}` for a setting.
 */
export default function Checkbox({
  label,
  id,
  className,
  strike = true,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; strike?: boolean }) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn('flex min-h-8 items-center gap-2', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="peer size-4 shrink-0 cursor-pointer rounded-tag border border-border accent-ink"
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'cursor-pointer text-sm text-ink',
          strike && 'peer-checked:text-muted peer-checked:line-through'
        )}
      >
        {label}
      </label>
    </div>
  )
}
