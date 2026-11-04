import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { parseMaintenance } from '#capture/intents/maintenance_intent'
import { parseReading } from '#capture/intents/meter_reading_intent'
import { matchProject } from '#capture/intents/project_expense_intent'
import { CHORE_WORDS } from '#capture/intents/task_intent'
import { normalize } from '#capture/normalizer'
import { HOME_ZONE } from '#support/dates'

/** Monday 2 November 2026, 9:00 in Paris. */
const reference = DateTime.fromISO('2026-11-02T09:00:00', { zone: HOME_ZONE })

test.group('Capture | maintenance corpus', () => {
  const corpus: Array<[string, string, number | null, number | null, string?]> = [
    ['vidange 89 € 101 000 km', 'oil_change', 8_900, 101_000],
    ['contrôle technique 78 € hier', 'inspection', 7_800, null, '2026-11-01'],
    ['plaquettes de frein 145,50 €', 'brakes', 14_550, null],
    ['révision clio 250 €', 'service', 25_000, null],
    ['changement batterie', 'battery', null, null],
  ]
  for (const [text, kind, cents, km, date] of corpus) {
    test(`« ${text} »`, ({ assert }) => {
      const parsed = parseMaintenance(text, reference)
      assert.equal(parsed.kind, kind)
      assert.equal(parsed.costCents, cents)
      assert.equal(parsed.odometerKm, km)
      if (date) assert.equal(parsed.doneOn?.toISODate(), date)
    })
  }
})

test.group('Capture | meter reading corpus', () => {
  const corpus: Array<[string, number, string | null, string?]> = [
    ['relevé eau 1234', 1234, 'water'],
    ['compteur élec 45 230,5', 45_230.5, 'electricity'],
    ['linky 12345 hier', 12_345, 'electricity', '2026-11-01'],
    ['index gaz 8912,3', 8_912.3, 'gas'],
  ]
  for (const [text, value, kind, date] of corpus) {
    test(`« ${text} »`, ({ assert }) => {
      const parsed = parseReading(text, reference)
      assert.equal(parsed.value, value)
      assert.equal(parsed.kind, kind)
      if (date) assert.equal(parsed.readOn?.toISODate(), date)
    })
  }
})

test.group('Capture | project and chore words', () => {
  const projects = [
    { id: 1, title: 'Repeindre la chambre' },
    { id: 2, title: 'Salle de bain : carrelage' },
  ]
  test('the project sharing the most words', ({ assert }) => {
    assert.equal(matchProject('travaux peinture chambre 45 €', projects)?.id, 1)
    assert.equal(matchProject('carrelage 320 €', projects)?.id, 2)
    assert.isNull(matchProject('café 4 €', projects))
  })

  test('chore titles', ({ assert }) => {
    for (const title of ['Passer l’aspirateur', 'Changer les draps', 'Sortir les poubelles']) {
      assert.isTrue(CHORE_WORDS.test(normalize(title)), title)
    }
    assert.isFalse(CHORE_WORDS.test(normalize('Appeler le plombier')))
  })
})
