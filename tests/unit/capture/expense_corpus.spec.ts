import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { parseExpense } from '#capture/intents/expense_intent'
import { HOME_ZONE } from '#support/dates'

/**
 * Real phrases and what the expense intent must understand. The reference
 * date is fixed: Monday 2 November 2026, 9:00 in Paris.
 */
const reference = DateTime.fromISO('2026-11-02T09:00:00', { zone: HOME_ZONE })

const corpus: Array<{ text: string; amountCents: number | null; label: string; date?: string }> = [
  { text: 'café 4,50 €', amountCents: 450, label: 'Café' },
  { text: 'resto 32 € hier', amountCents: 3200, label: 'Resto', date: '2026-11-01' },
  { text: "j'ai payé 12 euros à la pharmacie", amountCents: 1200, label: 'Pharmacie' },
  {
    text: 'dépense 54,30€ courses samedi',
    amountCents: 5430,
    label: 'Courses',
    date: '2026-10-31',
  },
  { text: 'boulangerie 3,20', amountCents: 320, label: 'Boulangerie' },
  { text: 'cinéma 2€50 avant-hier', amountCents: 250, label: 'Cinéma', date: '2026-10-31' },
  { text: 'resto 25 € le 12/10', amountCents: 2500, label: 'Resto', date: '2026-10-12' },
  { text: 'coiffeur 28 € le 15', amountCents: 2800, label: 'Coiffeur', date: '2026-10-15' },
  { text: 'Kebab 9 € vendredi', amountCents: 900, label: 'Kebab', date: '2026-10-30' },
  { text: 'livre pour Léa 18,90 €', amountCents: 1890, label: 'Livre pour Léa' },
  { text: 'acheter du pain', amountCents: null, label: 'Acheter du pain' },
]

test.group('Capture | expense corpus', () => {
  for (const entry of corpus) {
    test(`« ${entry.text} »`, ({ assert }) => {
      const parsed = parseExpense(entry.text, reference)
      assert.equal(parsed.amountCents, entry.amountCents)
      assert.equal(parsed.label, entry.label)
      assert.equal(parsed.occurredOn?.toISODate() ?? undefined, entry.date)
    })
  }
})
