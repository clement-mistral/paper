import { type ButtonHTMLAttributes } from 'react'
import { cn } from '~/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

const base =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-bg hover:bg-ink/85',
  secondary: 'border border-border bg-bg text-ink hover:bg-hover',
  ghost: 'text-ink hover:bg-hover',
  danger: 'border border-border bg-bg text-danger hover:bg-danger-soft',
}

const sizes: Record<ButtonSize, string> = {
  md: 'h-9 px-3.5 text-sm',
  sm: 'h-8 px-2.5 text-label',
}

/**
 * Class names of a button, for elements that must look like one without
 * being a `<button>` (Inertia `<Link>`, for instance).
 */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(base, variants[variant], sizes[size])
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn(buttonClasses(variant, size), className)} {...props} />
}
