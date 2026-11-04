import { useEffect, useRef, useState } from 'react'
import type { Domain } from '#shared/types/domain'

/**
 * Mark colours: the domain hue, the only colour a chart carries (text
 * always uses the ink tokens). Literal class names so Tailwind keeps them.
 */
export const markColor: Record<Domain, { fill: string; stroke: string; bg: string }> = {
  budget: { fill: 'fill-budget', stroke: 'stroke-budget', bg: 'bg-budget' },
  maison: { fill: 'fill-maison', stroke: 'stroke-maison', bg: 'bg-maison' },
  auto: { fill: 'fill-auto', stroke: 'stroke-auto', bg: 'bg-auto' },
  menu: { fill: 'fill-menu', stroke: 'stroke-menu', bg: 'bg-menu' },
}

/**
 * Round tick values covering [min, max]: 1, 2 or 5 times a power of ten
 * (never 2.5: « 1,825 » would print as « 1,83 »).
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max === min) {
    const pad = Math.abs(max) > 0 ? Math.abs(max) * 0.1 : 1
    min -= pad
    max += pad
  }
  const rough = (max - min) / count
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((s) => s >= rough)!
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let value = start; value <= max + step * 0.5; value += step) {
    ticks.push(Math.round(value / step) * step)
    if (ticks[ticks.length - 1] >= max) break
  }
  return ticks
}

/**
 * Width of an element, following resizes. Starts at `fallback` (server
 * render, first paint).
 */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Arrow keys move the active point, Home/End jump to the ends, Escape
 * clears it.
 */
export function stepActive(key: string, active: number | null, count: number): number | null {
  if (count === 0) return null
  if (key === 'ArrowRight') return active === null ? count - 1 : Math.min(count - 1, active + 1)
  if (key === 'ArrowLeft') return active === null ? count - 1 : Math.max(0, active - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'Escape') return null
  return active
}

/** Rough width of a tick label in the 11px UI font. */
export function textWidth(text: string): number {
  return text.length * 6.4
}
