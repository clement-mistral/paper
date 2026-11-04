import { useState } from 'react'
import { cn } from '~/lib/cn'
import type { Domain } from '#shared/types/domain'
import { ChartFrame, ChartTable, ChartTooltip } from '~/components/charts/chart_parts'
import {
  markColor,
  niceTicks,
  stepActive,
  textWidth,
  useWidth,
} from '~/components/charts/chart_utils'

export type ColumnDatum = {
  key: string
  /** Axis label (« nov. »). */
  label: string
  /** Tooltip and table label (« novembre 2026 »). */
  detail: string
  value: number
}

const DEFAULT_HEIGHT = 220
const TOP = 26
const BOTTOM = 26
const RIGHT = 8
const MAX_BAR = 24
const RADIUS = 4

/**
 * Rounded data end, square at the baseline.
 */
function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, height, width / 2)
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `H${x + width - r}`,
    `A${r},${r} 0 0 1 ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}

/**
 * One series of columns over ordered categories (months). Values are
 * labelled on the last column and the highest one only; the tooltip and
 * the table carry the rest. An optional reference (a budget) is a solid
 * hairline on the same axis.
 */
export default function ColumnChart({
  title,
  data,
  domain,
  format,
  formatAxis = format,
  reference,
  height = DEFAULT_HEIGHT,
  table = true,
}: {
  title: string
  data: ColumnDatum[]
  domain: Domain
  format: (value: number) => string
  formatAxis?: (value: number) => string
  /** A level on the same axis (a budget), keyed below the chart. */
  reference?: { value: number; label: string }
  height?: number
  /** False on the printed report: the table only makes sense on screen. */
  table?: boolean
}) {
  const HEIGHT = height
  const [frameRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const color = markColor[domain]

  const max = Math.max(...data.map((datum) => datum.value), reference?.value ?? 0, 0)
  const ticks = niceTicks(0, max > 0 ? max : 1, 4).filter((tick) => tick >= 0)
  const top = ticks[ticks.length - 1]
  const left = Math.max(...ticks.map((tick) => textWidth(formatAxis(tick)))) + 10
  const innerWidth = Math.max(width - left - RIGHT, 40)
  const innerHeight = HEIGHT - TOP - BOTTOM
  const band = innerWidth / Math.max(data.length, 1)
  const barWidth = Math.min(MAX_BAR, band * 0.62)
  const y = (value: number) => TOP + innerHeight - (value / top) * innerHeight
  const centerX = (index: number) => left + band * index + band / 2

  const last = data.length - 1
  const highest = data.reduce(
    (best, datum, index) => (datum.value > data[best].value ? index : best),
    0
  )
  const labelled = new Set([last])
  if (data[highest]?.value > 0 && Math.abs(highest - last) > 1) labelled.add(highest)
  const everyOther = band < 34

  const current = active === null ? null : data[active]

  return (
    <div className="flex flex-col gap-2">
      <ChartFrame
        title={title}
        frameRef={frameRef}
        announce={current ? `${current.detail} : ${format(current.value)}` : ''}
        onKeyDown={(event) => {
          const next = stepActive(event.key, active, data.length)
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
          className="block overflow-visible"
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

          {data.map((datum, index) => {
            const barHeight = Math.max(y(0) - y(datum.value), 0)
            const x = centerX(index) - barWidth / 2
            return (
              <g key={datum.key}>
                {barHeight > 0 && (
                  <path
                    d={columnPath(x, y(datum.value), barWidth, barHeight)}
                    className={cn(color.fill, 'transition-opacity')}
                    opacity={active === null || active === index ? 1 : 0.45}
                  />
                )}
                {labelled.has(index) && datum.value > 0 && (
                  <text
                    x={centerX(index)}
                    y={y(datum.value) - 6}
                    textAnchor="middle"
                    className="fill-ink text-[11px] font-medium tabular-nums"
                  >
                    {format(datum.value)}
                  </text>
                )}
                {(!everyOther || (last - index) % 2 === 0) && (
                  <text
                    x={centerX(index)}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className={cn(
                      'text-[11px]',
                      active === index ? 'fill-ink font-medium' : 'fill-muted'
                    )}
                  >
                    {datum.label}
                  </text>
                )}
                <rect
                  x={left + band * index}
                  y={TOP}
                  width={band}
                  height={innerHeight + BOTTOM}
                  fill="transparent"
                  onPointerEnter={() => setActive(index)}
                />
              </g>
            )
          })}

          {reference && reference.value > 0 && (
            <g aria-hidden="true">
              <line
                x1={left}
                x2={left + innerWidth}
                y1={y(reference.value)}
                y2={y(reference.value)}
                className="stroke-ink"
                strokeOpacity={0.45}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            </g>
          )}

          <line
            x1={left}
            x2={left + innerWidth}
            y1={y(0)}
            y2={y(0)}
            className="stroke-muted"
            strokeOpacity={0.5}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        </svg>

        {current && active !== null && (
          <ChartTooltip
            x={centerX(active)}
            y={y(current.value)}
            width={width}
            value={format(current.value)}
            label={current.detail}
          />
        )}
      </ChartFrame>

      {reference && reference.value > 0 && (
        <p className="flex items-center gap-2 text-label text-muted">
          <span aria-hidden="true" className="h-px w-4 bg-ink/45" />
          {reference.label}
        </p>
      )}

      {table && (
        <ChartTable
          caption={title}
          header={['Mois', 'Montant']}
          rows={[...data].reverse().map((datum) => ({
            key: datum.key,
            label: datum.detail,
            value: format(datum.value),
          }))}
        />
      )}
    </div>
  )
}
