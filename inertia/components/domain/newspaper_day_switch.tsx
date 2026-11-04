import { Link } from '@adonisjs/inertia/react'
import { cn } from '~/lib/cn'
import { shiftDay } from '~/lib/format'

/**
 * « Aujourd’hui | Demain » : today's sheet, or tomorrow's to prepare in
 * the evening. `route` is the page to open for the chosen day.
 */
export default function NewspaperDaySwitch({
  day,
  today,
  route,
}: {
  day: string
  today: string
  route: 'newspapers.show' | 'newspapers.choice'
}) {
  const tomorrow = shiftDay(today, 1)
  const options = [
    { day: today, label: 'Aujourd’hui' },
    { day: tomorrow, label: 'Demain' },
  ]
  return (
    <div
      role="group"
      aria-label="Édition"
      className="inline-flex rounded-control border border-border p-0.5"
    >
      {options.map((option) => (
        <Link
          key={option.day}
          route={route}
          routeParams={{ day: option.day }}
          aria-current={option.day === day ? 'page' : undefined}
          className={cn(
            'rounded-[4px] px-2.5 py-1 text-sm',
            option.day === day ? 'bg-ink text-bg' : 'text-ink hover:bg-hover'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
