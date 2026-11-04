import type { Domain } from '#shared/types/domain'

/**
 * Display metadata for each domain. Class names are written out in full so
 * Tailwind can detect them at build time; never build them dynamically.
 */
export const domainMeta: Record<
  Domain,
  { label: string; text: string; ink: string; soft: string; bar: string }
> = {
  budget: {
    label: 'Budget',
    text: 'text-budget',
    ink: 'text-budget-ink',
    soft: 'bg-budget-soft',
    bar: 'bg-budget',
  },
  maison: {
    label: 'Maison',
    text: 'text-maison',
    ink: 'text-maison-ink',
    soft: 'bg-maison-soft',
    bar: 'bg-maison',
  },
  auto: {
    label: 'Auto',
    text: 'text-auto',
    ink: 'text-auto-ink',
    soft: 'bg-auto-soft',
    bar: 'bg-auto',
  },
  menu: {
    label: 'Menu',
    text: 'text-menu',
    ink: 'text-menu-ink',
    soft: 'bg-menu-soft',
    bar: 'bg-menu',
  },
}
