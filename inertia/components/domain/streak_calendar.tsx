import { cn } from '~/lib/cn'
import { formatDate } from '~/lib/format'
import type { Streak } from '#shared/types/routine'

const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

/**
 * Validated days of the last 26 weeks, one square per day, weeks in
 * columns (Monday on top). Ink only: colour is reserved for domains.
 */
export default function StreakCalendar({ streak }: { streak: Streak }) {
  /**
   * Pad the first week so columns start on Monday.
   */
  const first = new Date(`${streak.days[0].day}T12:00:00`)
  const offset = (first.getDay() + 6) % 7
  const cells: Array<(typeof streak.days)[number] | null> = [
    ...Array.from({ length: offset }, () => null),
    ...streak.days,
  ]
  const weeks: Array<typeof cells> = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))

  const completed = streak.days.filter((day) => day.completed).length
  const last = streak.days[streak.days.length - 1].day

  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={`${completed} journées validées sur les 6 derniers mois`}
          className="inline-flex gap-[3px]"
        >
          {weeks.map((week, index) => {
            const start = week.find((day) => day !== null)
            const month = start ? new Date(`${start.day}T12:00:00`).getMonth() : null
            const previous = weeks[index - 1]?.find((day) => day !== null)
            const showMonth =
              start && (!previous || new Date(`${previous.day}T12:00:00`).getMonth() !== month)
            return (
              <div key={index} className="flex flex-col gap-[3px]">
                <span className="h-4 text-[10px] leading-4 whitespace-nowrap text-muted">
                  {showMonth && month !== null ? MONTHS[month] : ''}
                </span>
                {week.map((day, row) =>
                  day ? (
                    <span
                      key={day.day}
                      title={`${formatDate(day.day)}${day.completed ? ' · validée' : ''}`}
                      className={cn(
                        'size-3 rounded-[2px]',
                        day.completed ? 'bg-ink' : 'bg-hover',
                        day.day === last && 'ring-1 ring-ink ring-offset-1'
                      )}
                    />
                  ) : (
                    <span key={`pad-${row}`} className="size-3" />
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>
      <figcaption className="text-label text-muted">
        {completed} journée{completed > 1 ? 's' : ''} validée{completed > 1 ? 's' : ''} sur les 6
        derniers mois
      </figcaption>
    </figure>
  )
}
