import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cn } from '~/lib/cn'

export default function Checkbox({
  label,
  id,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
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
        className="cursor-pointer text-sm text-ink peer-checked:text-muted peer-checked:line-through"
      >
        {label}
      </label>
    </div>
  )
}
