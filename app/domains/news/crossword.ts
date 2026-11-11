import { type DateTime } from 'luxon'
import { seededRandom, shuffled } from '#support/seeded'
import { CROSSWORD_WORDS } from '#domains/news/crossword_words'

/**
 * Crossword of the day, drawn from the date like the sudoku: words of the
 * dictionary are laid one by one where they cross the most letters
 * already placed, never touching another word side by side. Several
 * drafts are made and the fullest kept. The solution is printed in the
 * next day's sheet.
 *
 * Grids are row by row; null is a cell outside every word.
 */

export type CrosswordClue = { number: number; clue: string; answer: string }

export type Crossword = {
  rows: number
  cols: number
  /** The letter of each cell, null outside the words. */
  letters: Array<string | null>
  /** The number printed in the cell where a word starts. */
  numbers: Array<number | null>
  across: CrosswordClue[]
  down: CrosswordClue[]
}

/** Largest grid drawn, before it is cropped to its words. */
export const MAX_SIZE = 13
const WANTED_WORDS = 18
const DRAFTS = 10

type Direction = 'across' | 'down'
type Placement = { word: string; clue: string; row: number; col: number; direction: Direction }

class Draft {
  letters: Array<string | null> = new Array(MAX_SIZE * MAX_SIZE).fill(null)
  /** Directions of the words through each cell: 1 across, 2 down. */
  through: number[] = new Array(MAX_SIZE * MAX_SIZE).fill(0)
  placements: Placement[] = []
  crossings = 0

  private at(row: number, col: number): string | null {
    if (row < 0 || col < 0 || row >= MAX_SIZE || col >= MAX_SIZE) return null
    return this.letters[row * MAX_SIZE + col]
  }

  /**
   * Letters the word would cross there, or -1 when it cannot go: out of
   * the grid, a different letter in the way, a word running alongside,
   * or a word continuing it at either end.
   */
  crossingsOf(word: string, row: number, col: number, direction: Direction): number {
    const dr = direction === 'down' ? 1 : 0
    const dc = direction === 'across' ? 1 : 0
    const endRow = row + dr * (word.length - 1)
    const endCol = col + dc * (word.length - 1)
    if (row < 0 || col < 0 || endRow >= MAX_SIZE || endCol >= MAX_SIZE) return -1
    if (this.at(row - dr, col - dc) !== null || this.at(endRow + dr, endCol + dc) !== null) {
      return -1
    }
    const bit = direction === 'across' ? 1 : 2
    let crossed = 0
    for (const [index, letter] of [...word].entries()) {
      const r = row + dr * index
      const c = col + dc * index
      const existing = this.at(r, c)
      if (existing !== null) {
        if (existing !== letter || this.through[r * MAX_SIZE + c] & bit) return -1
        crossed++
      } else if (this.at(r + dc, c + dr) !== null || this.at(r - dc, c - dr) !== null) {
        return -1
      }
    }
    return crossed === word.length ? -1 : crossed
  }

  place(placement: Placement, crossed: number) {
    const dr = placement.direction === 'down' ? 1 : 0
    const dc = placement.direction === 'across' ? 1 : 0
    const bit = placement.direction === 'across' ? 1 : 2
    for (let index = 0; index < placement.word.length; index++) {
      const cell = (placement.row + dr * index) * MAX_SIZE + placement.col + dc * index
      this.letters[cell] = placement.word[index]
      this.through[cell] |= bit
    }
    this.placements.push(placement)
    this.crossings += crossed
  }

  /** The best spot crossing at least one letter, ties drawn at random. */
  bestSpot(word: string, next: () => number) {
    let best: { row: number; col: number; direction: Direction; crossed: number } | null = null
    let ties = 0
    for (let cell = 0; cell < this.letters.length; cell++) {
      const letter = this.letters[cell]
      if (letter === null) continue
      const row = Math.floor(cell / MAX_SIZE)
      const col = cell % MAX_SIZE
      for (let index = 0; index < word.length; index++) {
        if (word[index] !== letter) continue
        for (const direction of ['across', 'down'] as const) {
          const start =
            direction === 'across' ? { row, col: col - index } : { row: row - index, col }
          const crossed = this.crossingsOf(word, start.row, start.col, direction)
          if (crossed <= 0) continue
          if (!best || crossed > best.crossed) {
            best = { ...start, direction, crossed }
            ties = 1
          } else if (crossed === best.crossed && next() < 1 / ++ties) {
            best = { ...start, direction, crossed }
          }
        }
      }
    }
    return best
  }

  get score(): number {
    return this.placements.length * 10 + this.crossings * 3
  }
}

function draft(next: () => number): Draft {
  const words = shuffled(CROSSWORD_WORDS, next).filter(([word]) => word.length <= MAX_SIZE - 2)
  const grid = new Draft()
  const firstIndex = words.findIndex(([word]) => word.length >= 7)
  const [first, firstClue] = words.splice(firstIndex, 1)[0]
  grid.place(
    {
      word: first,
      clue: firstClue,
      row: Math.floor(MAX_SIZE / 2),
      col: Math.floor((MAX_SIZE - first.length) / 2),
      direction: 'across',
    },
    0
  )
  /** Two passes: a word that fitted nowhere may fit once others are in. */
  for (let pass = 0; pass < 2 && grid.placements.length < WANTED_WORDS; pass++) {
    for (let index = 0; index < words.length && grid.placements.length < WANTED_WORDS;) {
      const [word, clue] = words[index]
      const spot = grid.bestSpot(word, next)
      if (spot) {
        grid.place({ word, clue, ...spot }, spot.crossed)
        words.splice(index, 1)
      } else {
        index++
      }
    }
  }
  return grid
}

/** The draft cropped to its words, numbered in reading order. */
function finish(grid: Draft): Crossword {
  let top = MAX_SIZE
  let bottom = 0
  let left = MAX_SIZE
  let right = 0
  grid.letters.forEach((letter, cell) => {
    if (letter === null) return
    const row = Math.floor(cell / MAX_SIZE)
    const col = cell % MAX_SIZE
    top = Math.min(top, row)
    bottom = Math.max(bottom, row)
    left = Math.min(left, col)
    right = Math.max(right, col)
  })
  const rows = bottom - top + 1
  const cols = right - left + 1
  const letters: Array<string | null> = []
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) letters.push(grid.letters[row * MAX_SIZE + col])
  }

  const starts = new Map<number, Placement[]>()
  for (const placement of grid.placements) {
    const cell = (placement.row - top) * cols + placement.col - left
    starts.set(cell, [...(starts.get(cell) ?? []), placement])
  }
  const numbers: Array<number | null> = new Array(rows * cols).fill(null)
  const across: CrosswordClue[] = []
  const down: CrosswordClue[] = []
  let number = 0
  for (let cell = 0; cell < rows * cols; cell++) {
    const here = starts.get(cell)
    if (!here) continue
    numbers[cell] = ++number
    for (const placement of here) {
      const clue = { number, clue: placement.clue, answer: placement.word }
      ;(placement.direction === 'across' ? across : down).push(clue)
    }
  }
  return { rows, cols, letters, numbers, across, down }
}

export function crosswordOf(day: DateTime): Crossword {
  const next = seededRandom(`${day.toISODate()}:crossword`)
  let best: Draft | null = null
  for (let attempt = 0; attempt < DRAFTS; attempt++) {
    const candidate = draft(next)
    if (!best || candidate.score > best.score) best = candidate
  }
  return finish(best!)
}
