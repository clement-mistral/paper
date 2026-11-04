import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { extractAmount, extractDate, extractRecurrence, extractTime } from '#capture/extractors'
import { parseTask } from '#capture/intents/task_intent'
import { wordsToDigits } from '#capture/numbers'
import { parsePeriod } from '#capture/questions'
import { normalize } from '#capture/normalizer'
import { nextOccurrence } from '#domains/lists/services/recurrence'
import { HOME_ZONE } from '#support/dates'

/**
 * Reference: Monday 2 November 2026, 9:00 in Paris.
 */
const reference = DateTime.fromISO('2026-11-02T09:00:00', { zone: HOME_ZONE })

test.group('Understanding | spelled numbers', () => {
  const cases: Array<[string, string]> = [
    ['deux litres de lait', '2 litres de lait'],
    ['raclette pour six', 'raclette pour 6'],
    ['quatre personnes', '4 personnes'],
    ['vingt-cinq euros', '25 euros'],
    ['quatre-vingt-dix euros', '90 euros'],
    ['deux cents euros', '200 euros'],
    ['un café', 'un café'],
    ['une baguette et deux croissants', 'une baguette et deux croissants'],
    ['dans trois jours', 'dans 3 jours'],
  ]
  for (const [text, expected] of cases) {
    test(`« ${text} » → « ${expected} »`, ({ assert }) => {
      assert.equal(wordsToDigits(text), expected)
    })
  }
})

test.group('Understanding | amounts, times, dates', () => {
  test('« 4e50 » and « 12e » are euros', ({ assert }) => {
    assert.equal(extractAmount('café 4e50')?.cents, 450)
    assert.equal(extractAmount('resto 12e')?.cents, 1200)
    assert.isNull(extractAmount('essence e10'))
  })

  const times: Array<[string, string | null]> = [
    ['demain à 14h', '14:00'],
    ['jeudi 18h30', '18:30'],
    ['rdv 9 heures', '09:00'],
    ['18:45', '18:45'],
    ['3 jours', null],
  ]
  for (const [text, time] of times) {
    test(`time of « ${text} »`, ({ assert }) => {
      assert.equal(extractTime(text)?.time ?? null, time)
    })
  }

  const dates: Array<[string, string]> = [
    ['fin du mois', '2026-11-30'],
    ['ce week-end', '2026-11-07'],
    ['semaine prochaine', '2026-11-09'],
    ['dans 3 jours', '2026-11-05'],
    ['le mois prochain', '2026-12-02'],
  ]
  for (const [text, date] of dates) {
    test(`date of « ${text} »`, ({ assert }) => {
      assert.equal(extractDate(text, 'future', reference)?.date.toISODate(), date)
    })
  }
})

test.group('Understanding | recurrence', () => {
  const cases: Array<[string, string, number, number | null]> = [
    ['tous les jours', 'daily', 1, null],
    ['tous les mardis', 'weekly', 1, 2],
    ['toutes les 2 semaines', 'weekly', 2, null],
    ['tous les 15 jours', 'daily', 15, null],
    ['tous les 14 jours', 'weekly', 2, null],
    ['chaque mois', 'monthly', 1, null],
    ['tous les ans', 'yearly', 1, null],
  ]
  for (const [text, recurrence, interval, weekday] of cases) {
    test(`« ${text} »`, ({ assert }) => {
      const match = extractRecurrence(text)
      assert.equal(match?.recurrence, recurrence)
      assert.equal(match?.interval, interval)
      assert.equal(match?.weekday ?? null, weekday)
    })
  }

  test('a late recurring task does not pile up occurrences', ({ assert }) => {
    const due = DateTime.fromISO('2026-10-20', { zone: HOME_ZONE })
    const next = nextOccurrence('weekly', 1, due, reference.startOf('day'))
    assert.equal(next.toISODate(), '2026-11-03')
  })
})

test.group('Understanding | task corpus', () => {
  const corpus = [
    {
      text: 'appeler le plombier demain 14h',
      title: 'Appeler le plombier',
      due: '2026-11-03',
      time: '14:00',
      domain: 'maison',
    },
    { text: 'penser à payer la cantine lundi', title: 'Payer la cantine', due: '2026-11-02' },
    {
      text: 'rappelle-moi de prendre rdv au garage vendredi',
      title: 'Prendre rdv au garage',
      due: '2026-11-06',
      domain: 'auto',
    },
    {
      text: 'sortir les poubelles tous les mardis',
      title: 'Sortir les poubelles',
      due: '2026-11-03',
      recurrence: 'weekly',
    },
    {
      text: 'à faire : changer l’ampoule du salon',
      title: 'Changer l’ampoule du salon',
      due: undefined,
    },
    { text: 'dentiste jeudi à 9h30', title: 'Dentiste', due: '2026-11-05', time: '09:30' },
  ]
  for (const entry of corpus) {
    test(`« ${entry.text} »`, ({ assert }) => {
      const parsed = parseTask(entry.text, reference)
      assert.equal(parsed.title, entry.title)
      assert.equal(parsed.dueOn?.toISODate() ?? undefined, entry.due)
      if (entry.time) assert.equal(parsed.dueTime, entry.time)
      if (entry.domain) assert.equal(parsed.domain, entry.domain)
      if (entry.recurrence) assert.equal(parsed.recurrence, entry.recurrence)
    })
  }

  test('reads a checklist after « : »', ({ assert }) => {
    const parsed = parseTask('préparer les vacances : valises, passeports et chargeurs', reference)
    assert.equal(parsed.title, 'Préparer les vacances')
    assert.deepEqual(parsed.items, ['Valises', 'Passeports', 'Chargeurs'])
  })
})

test.group('Understanding | question periods', () => {
  const cases: Array<[string, string, string]> = [
    ['combien en resto ce mois', '2026-11-01', '2026-11-02'],
    ['depenses du mois dernier', '2026-10-01', '2026-10-31'],
    ['combien cette semaine', '2026-11-02', '2026-11-02'],
    ['combien en octobre', '2026-10-01', '2026-10-31'],
    ['combien hier', '2026-11-01', '2026-11-01'],
  ]
  for (const [text, start, end] of cases) {
    test(`« ${text} »`, ({ assert }) => {
      const period = parsePeriod(normalize(text), reference)
      assert.equal(period.start.toISODate(), start)
      assert.equal(period.end.toISODate(), end)
    })
  }
})
