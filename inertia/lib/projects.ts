import type { ProjectStatus } from '#shared/types/projects'

/**
 * One colour per status of a project. Literal classes, for Tailwind to
 * see them.
 */
export const STATUS_TONES: Record<
  ProjectStatus,
  { dot: string; soft: string; text: string; edge: string }
> = {
  idea: {
    dot: 'bg-maison',
    soft: 'bg-maison-soft',
    text: 'text-maison-ink',
    edge: 'border-l-maison',
  },
  active: {
    dot: 'bg-accent',
    soft: 'bg-accent-soft',
    text: 'text-accent-ink',
    edge: 'border-l-accent',
  },
  paused: {
    dot: 'bg-warning-bar',
    soft: 'bg-warning-soft',
    text: 'text-warning',
    edge: 'border-l-warning-bar',
  },
  done: {
    dot: 'bg-success',
    soft: 'bg-success-soft',
    text: 'text-success',
    edge: 'border-l-success',
  },
}
