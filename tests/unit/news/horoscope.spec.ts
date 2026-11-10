import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  ADVICES,
  CHARMS,
  CLIMATES,
  horoscopeOf,
  parseSigns,
  sunSignOf,
} from '#domains/news/horoscope'
import { ZODIAC_KEYS } from '#shared/types/news'

const day = DateTime.fromISO('2026-11-10', { zone: 'Europe/Paris' })

test.group('News | horoscope', () => {
  test('the banks have a line for each sign, without duplicates', ({ assert }) => {
    for (const bank of [CLIMATES, ADVICES, CHARMS]) {
      assert.isAtLeast(bank.length, 12)
      assert.lengthOf(new Set(bank), bank.length)
    }
  })

  test('same day, same horoscope; another day, another one', ({ assert }) => {
    assert.deepEqual(horoscopeOf(day, ZODIAC_KEYS), horoscopeOf(day, ZODIAC_KEYS))
    const tomorrow = horoscopeOf(day.plus({ days: 1 }), ZODIAC_KEYS)
    assert.notDeepEqual(
      horoscopeOf(day, ZODIAC_KEYS).map((entry) => entry.text),
      tomorrow.map((entry) => entry.text)
    )
  })

  test('two signs never read the same line the same day', ({ assert }) => {
    for (let offset = 0; offset < 60; offset++) {
      const entries = horoscopeOf(day.plus({ days: offset }), ZODIAC_KEYS)
      assert.lengthOf(new Set(entries.map((entry) => entry.text)), 12)
      assert.lengthOf(new Set(entries.map((entry) => entry.charm)), 12)
    }
  })

  test('only the household’s signs, in the zodiac order', ({ assert }) => {
    const entries = horoscopeOf(day, ['leo', 'aries'])
    assert.deepEqual(
      entries.map((entry) => [entry.label, entry.dates]),
      [
        ['Bélier', '21 mars – 19 avr.'],
        ['Lion', '23 juil. – 22 août'],
      ]
    )
    assert.deepEqual(
      entries[1],
      horoscopeOf(day, ZODIAC_KEYS)[4],
      'a sign reads the same whatever the others'
    )
    assert.lengthOf(horoscopeOf(day, []), 0)
  })

  test('the sign of the Sun, across the new year too', ({ assert }) => {
    const at = (iso: string) => sunSignOf(DateTime.fromISO(iso))
    assert.equal(at('2026-11-10'), 'Scorpion')
    assert.equal(at('2026-11-22'), 'Sagittaire')
    assert.equal(at('2026-12-31'), 'Capricorne')
    assert.equal(at('2027-01-01'), 'Capricorne')
    assert.equal(at('2027-01-20'), 'Verseau')
    assert.equal(at('2028-02-29'), 'Poissons')
    assert.equal(at('2027-03-21'), 'Bélier')
  })

  test('stored signs: unknown keys dropped, zodiac order', ({ assert }) => {
    assert.deepEqual(parseSigns('leo,nope,aries'), ['aries', 'leo'])
    assert.deepEqual(parseSigns(''), [])
    assert.deepEqual(parseSigns(null), [])
  })
})
