import { type DateTime } from 'luxon'
import { seededRandom, shuffled } from '#support/seeded'
import type { SudokuLevel } from '#shared/types/news'

/**
 * Sudoku of the day, drawn from the date: a full grid, then digits taken
 * out two by two (180° symmetry, as in the papers) as long as the grid
 * keeps a single solution. Easy early in the week, harder at the weekend;
 * the solution is printed in the next day's sheet.
 *
 * Grids are 81 digits, row by row; 0 is an empty cell.
 */

export type Sudoku = { level: SudokuLevel; puzzle: number[]; solution: number[] }

/** Givens aimed at, by level: fewer is harder. */
const TARGET_GIVENS: Record<SudokuLevel, number> = { Facile: 38, Moyen: 32, Difficile: 26 }

/** Monday, Tuesday easy; Wednesday, Thursday medium; then hard. */
export function levelOf(day: DateTime): SudokuLevel {
  if (day.weekday <= 2) return 'Facile'
  if (day.weekday <= 4) return 'Moyen'
  return 'Difficile'
}

const ROW = (cell: number) => Math.floor(cell / 9)
const COL = (cell: number) => cell % 9
const BOX = (cell: number) => Math.floor(ROW(cell) / 3) * 3 + Math.floor(COL(cell) / 3)
const ALL = 0b1111111110

/** Bit masks of the digits used in each row, column and box. */
function masks(grid: number[]) {
  const rows = new Array<number>(9).fill(0)
  const cols = new Array<number>(9).fill(0)
  const boxes = new Array<number>(9).fill(0)
  for (let cell = 0; cell < 81; cell++) {
    const digit = grid[cell]
    if (digit === 0) continue
    const bit = 1 << digit
    rows[ROW(cell)] |= bit
    cols[COL(cell)] |= bit
    boxes[BOX(cell)] |= bit
  }
  return { rows, cols, boxes }
}

function bitCount(value: number): number {
  let count = 0
  for (let rest = value; rest; rest &= rest - 1) count++
  return count
}

/**
 * Number of solutions, counted up to `limit`. Fills `grid` in place with
 * the last one found when `keep` is set. Backtracking on the cell with
 * the fewest candidates; `order` picks the digit order (random to fill).
 */
function solve(
  grid: number[],
  limit: number,
  order: (candidates: number[]) => number[] = (candidates) => candidates,
  keep = false
): number {
  const work = [...grid]
  const { rows, cols, boxes } = masks(work)
  let found = 0

  const search = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCount = 10
    for (let cell = 0; cell < 81; cell++) {
      if (work[cell] !== 0) continue
      const free = ALL & ~(rows[ROW(cell)] | cols[COL(cell)] | boxes[BOX(cell)])
      const count = bitCount(free)
      if (count < bestCount) {
        best = cell
        bestMask = free
        bestCount = count
        if (count <= 1) break
      }
    }
    if (best === -1) {
      found++
      if (keep) grid.splice(0, 81, ...work)
      return found >= limit
    }
    if (bestCount === 0) return false
    const candidates: number[] = []
    for (let digit = 1; digit <= 9; digit++) if (bestMask & (1 << digit)) candidates.push(digit)
    const row = ROW(best)
    const col = COL(best)
    const box = BOX(best)
    for (const digit of order(candidates)) {
      const bit = 1 << digit
      work[best] = digit
      rows[row] |= bit
      cols[col] |= bit
      boxes[box] |= bit
      const stop = search()
      work[best] = 0
      rows[row] &= ~bit
      cols[col] &= ~bit
      boxes[box] &= ~bit
      if (stop) return true
    }
    return false
  }

  search()
  return found
}

export function countSolutions(grid: number[], limit = 2): number {
  return solve(grid, limit)
}

export function sudokuOf(day: DateTime): Sudoku {
  const level = levelOf(day)
  const next = seededRandom(`${day.toISODate()}:sudoku`)

  const solution = new Array<number>(81).fill(0)
  solve(solution, 1, (candidates) => shuffled(candidates, next), true)

  const puzzle = [...solution]
  let givens = 81
  const pairs = shuffled(
    Array.from({ length: 41 }, (_, cell) => cell),
    next
  )
  for (const cell of pairs) {
    if (givens <= TARGET_GIVENS[level]) break
    const mirror = 80 - cell
    const removed = cell === mirror ? [cell] : [cell, mirror]
    const saved = removed.map((index) => puzzle[index])
    for (const index of removed) puzzle[index] = 0
    if (countSolutions(puzzle) === 1) {
      givens -= removed.length
    } else {
      removed.forEach((index, position) => (puzzle[index] = saved[position]))
    }
  }
  return { level, puzzle, solution }
}
