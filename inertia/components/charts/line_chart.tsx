import { useState } from 'react'
import type { Domain } from '#shared/types/domain'
import { ChartFrame, ChartTable, ChartTooltip } from '~/components/charts/chart_parts'
import {
  markColor,
  niceTicks,
  stepActive,
  textWidth,
  useWidth,
} from '~/components/charts/chart_utils'

export type LineDatum = {
  key: string
  /** ISO date `YYYY-MM-DD`, placed on a time scale. */
  date: string
  value: number
  /** Tooltip and table label. */
  detail: string
}

const HEIGHT = 200
const TOP = 28
const BOTTOM = 26
const RIGHT = 12

/**
 * One series over time: a 2px line over a 10 % wash, the latest value
 * labelled at its end dot, a crosshair snapping to the nearest point.
 */
export default function LineChart({
  title,
  data,
  domain,
  format,
  formatAxis = format,
  formatTick,
  zeroBased = false,
  table = true,
  tableHeader = ['Date', 'Valeur'],
}: {
  title: string
  data: LineDatum[]
  domain: Domain
  format: (value: number) => string
  formatAxis?: (value: number) => string
  /** X-axis tick label of a date. */
  formatTick: (date: string) => string
  zeroBased?: boolean
  /** False when the page already lists the same values in a table. */
  table?: boolean
  tableHeader?: [string, string]
}) {
  const [frameRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const color = markColor[domain]

  const points = [...data].sort((a, b) => a.date.localeCompare(b.date))
  if (points.length === 0) return null
  const values = points.map((point) => point.value)
  const low = zeroBased ? Math.min(0, ...values) : Math.min(...values)
  const ticks = niceTicks(low, Math.max(...values), 4)
  const min = ticks[0]
  const max = ticks[ticks.length - 1]
  const left = Math.max(...ticks.map((tick) => textWidth(formatAxis(tick)))) + 10
  const innerWidth = Math.max(width - left - RIGHT, 40)
  const innerHeight = HEIGHT - TOP - BOTTOM

  const times = points.map((point) => Date.parse(point.date))
  const start = times[0]
  const end = times[times.length - 1]
  const x = (index: number) =>
    end === start
      ? left + innerWidth / 2
      : left + ((times[index] - start) / (end - start)) * innerWidth
  const y = (value: number) => TOP + innerHeight - ((value - min) / (max - min || 1)) * innerHeight

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.value)}`)
    .join(' ')
  const baseline = y(Math.max(min, Math.min(0, max)))
  const area =
    points.length > 1 ? `${line} L${x(points.length - 1)},${baseline} L${x(0)},${baseline} Z` : ''

  const tickCount = Math.max(2, Math.min(points.length, Math.floor(innerWidth / 90)))
  const tickIndexes = Array.from(
    new Set(
      Array.from({ length: tickCount }, (_, step) =>
        Math.round((step * (points.length - 1)) / Math.max(tickCount - 1, 1))
      )
    )
  )

  const last = points.length - 1
  const current = active === null ? null : points[active]

  const nearest = (pointerX: number) => {
    let best = 0
    points.forEach((_, index) => {
      if (Math.abs(x(index) - pointerX) < Math.abs(x(best) - pointerX)) best = index
    })
    return best
  }

  return (
    <div className="flex flex-col gap-2">
      <ChartFrame
        title={title}
        frameRef={frameRef}
        announce={current ? `${current.detail} : ${format(current.value)}` : ''}
        onKeyDown={(event) => {
          const next = stepActive(event.key, active, points.length)
          if (next !== active) {
            event.preventDefault()
            setActive(next)
          }
        }}
        onBlur={() => setActive(null)}
      >
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={title}
          className="block touch-pan-y overflow-visible"
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            setActive(nearest(event.clientX - bounds.left))
          }}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={left + innerWidth}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted text-[11px] tabular-nums"
              >
                {formatAxis(tick)}
              </text>
            </g>
          ))}

          {tickIndexes.map((index) => (
            <text
              key={points[index].key}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor={
                tickIndexes.length > 1 && index === 0
                  ? 'start'
                  : tickIndexes.length > 1 && index === last
                    ? 'end'
                    : 'middle'
              }
              className="fill-muted text-[11px]"
            >
              {formatTick(points[index].date)}
            </text>
          ))}

          {area && <path d={area} className={color.fill} fillOpacity={0.1} />}
          {points.length > 1 && (
            <path
              d={line}
              fill="none"
              className={color.stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {current && active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={TOP}
              y2={TOP + innerHeight}
              className="stroke-muted"
              strokeOpacity={0.6}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          )}

          <circle
            cx={x(last)}
            cy={y(points[last].value)}
            r={4}
            className={color.fill}
            stroke="var(--color-bg)"
            strokeWidth={2}
          />
          {(active === null || active !== last) && (
            <text
              x={x(last)}
              y={y(points[last].value) - 10}
              textAnchor={points.length > 1 ? 'end' : 'middle'}
              className="fill-ink text-[11px] font-medium tabular-nums"
            >
              {format(points[last].value)}
            </text>
          )}
          {current && active !== null && active !== last && (
            <circle
              cx={x(active)}
              cy={y(current.value)}
              r={4}
              className={color.fill}
              stroke="var(--color-bg)"
              strokeWidth={2}
            />
          )}
        </svg>

        {current && active !== null && (
          <ChartTooltip
            x={x(active)}
            y={y(current.value)}
            width={width}
            value={format(current.value)}
            label={current.detail}
            lineKey={color.bg}
          />
        )}
      </ChartFrame>

      {table && (
        <ChartTable
          caption={title}
          header={tableHeader}
          rows={[...points].reverse().map((point) => ({
            key: point.key,
            label: point.detail,
            value: format(point.value),
          }))}
        />
      )}
    </div>
  )
}
