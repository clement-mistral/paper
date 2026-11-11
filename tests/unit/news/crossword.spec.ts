import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { type Crossword, crosswordOf, MAX_SIZE } from '#domains/news/crossword'
import { CROSSWORD_WORDS } from '#domains/news/crossword_words'

const monday = DateTime.fromISO('2026-11-09', { zone: 'Europe/Paris' })

/** Every run of two letters or more, read across then down. */
function runs(grid: Crossword): string[] {
  const at = (row: number, col: number) =>
    row < grid.rows && col < grid.cols ? grid.letters[row * grid.cols + col] : null
  const found: string[] = []
  const read = (
    lines: number,
    length: number,
    cell: (line: number, step: number) => string | null
  ) => {
    for (let line = 0; line < lines; line++) {
      let word = ''
      for (let step = 0; step <= length; step++) {
        const letter = step < length ? cell(line, step) : null
        if (letter) word += letter
        else {
          if (word.length >= 2) found.push(word)
          word = ''
        }
      }
    }
  }
  read(grid.rows, grid.cols, (row, col) => at(row, col))
  read(grid.cols, grid.rows, (col, row) => at(row, col))
  return found
}

test.group('News | mots croisés', () => {
  test('the dictionary is written as in the grids, without duplicates', ({ assert }) => {
    const words = CROSSWORD_WORDS.map(([word]) => word)
    for (const word of words) assert.match(word, /^[A-Z]{3,}$/)
    assert.lengthOf(new Set(words), words.length)
  })

  test('every run of letters is a clued word, each word once, all linked', ({ assert }) => {
    for (let offset = 0; offset < 14; offset++) {
      const grid = crosswordOf(monday.plus({ days: offset }))
      const answers = [...grid.across, ...grid.down].map((clue) => clue.answer)
      assert.isAtLeast(answers.length, 12)
      assert.isAtMost(grid.rows, MAX_SIZE)
      assert.isAtMost(grid.cols, MAX_SIZE)
      assert.sameMembers(runs(grid), answers)
      assert.lengthOf(new Set(answers), answers.length)

      const filled = grid.letters.flatMap((letter, cell) => (letter ? [cell] : []))
      const seen = new Set([filled[0]])
      const queue = [filled[0]]
      while (queue.length > 0) {
        const cell = queue.pop()!
        const row = Math.floor(cell / grid.cols)
        const col = cell % grid.cols
        const around = [
          row > 0 ? cell - grid.cols : -1,
          row < grid.rows - 1 ? cell + grid.cols : -1,
          col > 0 ? cell - 1 : -1,
          col < grid.cols - 1 ? cell + 1 : -1,
        ]
        for (const next of around) {
          if (next >= 0 && grid.letters[next] && !seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
        }
      }
      assert.equal(seen.size, filled.length, 'a single block of words')
    }
  })

  test('numbered in reading order where words start', ({ assert }) => {
    const grid = crosswordOf(monday)
    const numbers = grid.numbers.filter((number) => number !== null)
    assert.deepEqual(
      numbers,
      numbers.map((_, index) => index + 1)
    )
    for (const clue of grid.across) {
      const cell = grid.numbers.indexOf(clue.number)
      const letters = grid.letters.slice(cell, cell + clue.answer.length).join('')
      assert.equal(letters, clue.answer)
    }
  })

  test('the same day gives the same grid, another day another one', ({ assert }) => {
    assert.deepEqual(crosswordOf(monday), crosswordOf(monday))
    assert.notDeepEqual(crosswordOf(monday).letters, crosswordOf(monday.plus({ days: 1 })).letters)
  })
})
