import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { countSolutions, levelOf, sudokuOf } from '#domains/news/sudoku'

const monday = DateTime.fromISO('2026-11-09', { zone: 'Europe/Paris' })

function isSolved(grid: number[]): boolean {
  const groups: number[][] = []
  for (let index = 0; index < 9; index++) {
    groups.push(grid.slice(index * 9, index * 9 + 9))
    groups.push(grid.filter((_, cell) => cell % 9 === index))
    groups.push(
      grid.filter(
        (_, cell) => Math.floor(Math.floor(cell / 9) / 3) * 3 + Math.floor((cell % 9) / 3) === index
      )
    )
  }
  return groups.every((group) => [...group].sort().join('') === '123456789')
}

test.group('News | sudoku', () => {
  test('a valid grid with a single solution, the givens taken from it', ({ assert }) => {
    for (let offset = 0; offset < 7; offset++) {
      const { puzzle, solution } = sudokuOf(monday.plus({ days: offset }))
      assert.isTrue(isSolved(solution))
      assert.equal(countSolutions(puzzle), 1)
      puzzle.forEach((digit, cell) => digit !== 0 && assert.equal(digit, solution[cell]))
      puzzle.forEach((digit, cell) => assert.equal(digit === 0, puzzle[80 - cell] === 0))
    }
  })

  test('the same day gives the same grid, another day another one', ({ assert }) => {
    assert.deepEqual(sudokuOf(monday), sudokuOf(monday))
    assert.notDeepEqual(sudokuOf(monday).puzzle, sudokuOf(monday.plus({ days: 1 })).puzzle)
  })

  test('harder along the week', ({ assert }) => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5, 6].map((offset) => levelOf(monday.plus({ days: offset }))),
      ['Facile', 'Facile', 'Moyen', 'Moyen', 'Difficile', 'Difficile', 'Difficile']
    )
    const givens = (offset: number) =>
      sudokuOf(monday.plus({ days: offset })).puzzle.filter((digit) => digit !== 0).length
    assert.isAbove(givens(0), givens(2))
    assert.isAbove(givens(2), givens(5))
  })
})
