import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { easterOf, holidayOf, holidaysOf, moonOf, phaseInstant } from '#domains/news/calendar'
import { parsePeriods, schoolHolidaysOn } from '#domains/news/services/school_holidays_service'

const paris = (iso: string) => DateTime.fromISO(iso, { zone: 'Europe/Paris' })
const utc = (k: number) => phaseInstant(k).toUTC().toFormat('yyyy-LL-dd HH:mm')

test.group('News | calendar', () => {
  test('phases of the Moon within a few minutes', ({ assert }) => {
    // Meeus, example 49.a: new moon of 1977-02-18 03:37:42 TD.
    assert.equal(utc(-283), '1977-02-18 03:38')
    // Published times (UTC) of 2025.
    const near = (k: number, expected: string) => {
      const minutes = phaseInstant(k).diff(DateTime.fromISO(expected, { zone: 'utc' }), 'minutes')
      assert.isBelow(Math.abs(minutes.minutes), 5, `${k} → ${utc(k)}, expected ${expected}`)
    }
    near(309.5, '2025-01-13T22:27')
    near(310, '2025-01-29T12:36')
    near(309.25, '2025-01-06T23:56')
    near(309.75, '2025-01-21T20:31')
    near(319.5, '2025-11-05T13:19')
  })

  test('the Moon of a day', ({ assert }) => {
    assert.containsSubset(moonOf(paris('2025-11-05')), {
      label: 'Pleine lune',
      time: '14h20',
      principal: 'full',
    })
    assert.containsSubset(moonOf(paris('2025-11-08')), {
      label: 'Lune gibbeuse décroissante',
      time: null,
      // 2025-12-04 23:14 UTC: past midnight in Paris.
      nextFull: '2025-12-05',
    })
  })

  test('public holidays, Easter included', ({ assert }) => {
    assert.deepEqual(
      [2024, 2025, 2026, 2027].map((year) => easterOf(year).toISODate()),
      ['2024-03-31', '2025-04-20', '2026-04-05', '2027-03-28']
    )
    const year = holidaysOf(2026)
    assert.lengthOf(year, 11)
    assert.deepInclude(year, { name: 'Ascension', day: '2026-05-14' })
    assert.deepInclude(year, { name: 'Lundi de Pentecôte', day: '2026-05-25' })

    assert.deepEqual(holidayOf(paris('2026-11-10')), {
      today: null,
      next: { name: 'Armistice 1918', day: '2026-11-11', inDays: 1, bridge: false },
    })
    assert.equal(holidayOf(paris('2026-12-25')).today, 'Noël')
    assert.containsSubset(holidayOf(paris('2026-12-26')).next, {
      name: 'Jour de l’An',
      day: '2027-01-01',
    })
    assert.isTrue(holidayOf(paris('2027-05-05')).next.bridge, 'Ascension, a Thursday')
  })

  test('school holidays from the official calendar', ({ assert }) => {
    const periods = parsePeriods({
      results: [
        {
          description: 'Vacances de Noël',
          population: '-',
          start_date: '2026-12-18T23:00:00+00:00',
          end_date: '2027-01-03T23:00:00+00:00',
        },
        {
          description: 'Vacances de Noël',
          population: '-',
          start_date: '2026-12-18T23:00:00+00:00',
          end_date: '2027-01-03T23:00:00+00:00',
        },
        {
          description: "Pont de l'Ascension",
          population: '-',
          start_date: '2027-05-06T22:00:00+00:00',
          end_date: '2027-05-06T22:00:00+00:00',
        },
        {
          description: "Vacances d'Été",
          population: 'Enseignants',
          start_date: '2027-07-02T22:00:00+00:00',
          end_date: '2027-08-31T22:00:00+00:00',
        },
      ],
    })
    assert.deepEqual(periods, [
      { name: 'Vacances de Noël', firstDay: '2026-12-19', lastDay: '2027-01-03' },
      { name: 'Pont de l’Ascension', firstDay: '2027-05-07', lastDay: '2027-05-07' },
    ])
    assert.deepEqual(schoolHolidaysOn('B', '2026-11-10', periods), {
      zone: 'B',
      current: null,
      next: { name: 'Vacances de Noël', firstDay: '2026-12-19', inDays: 39 },
    })
    assert.deepEqual(schoolHolidaysOn('B', '2027-01-03', periods).current, {
      name: 'Vacances de Noël',
      lastDay: '2027-01-03',
    })
    assert.isNull(schoolHolidaysOn('B', '2027-01-04', periods).current)
  })
})
