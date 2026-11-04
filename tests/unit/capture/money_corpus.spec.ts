import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { parseTransfer } from '#capture/intents/transfer_intent'
import { parseExpense } from '#capture/intents/expense_intent'
import { HOME_ZONE } from '#support/dates'

/**
 * Reference: Monday 2 November 2026, 9:00 in Paris.
 */
const reference = DateTime.fromISO('2026-11-02T09:00:00', { zone: HOME_ZONE })

const accounts = [
  { id: 1, name: 'Compte courant' },
  { id: 2, name: 'Livret A' },
  { id: 3, name: 'Épargne' },
]

test.group('Capture | transfer corpus', () => {
  const corpus: Array<[string, number | null, number | null, number, string?]> = [
    ['virement 200 € vers le livret', null, 2, 20_000],
    ['vire 300 € du compte courant sur l’épargne', 1, 3, 30_000],
    ['virement de 150 € depuis épargne vers compte courant', 3, 1, 15_000],
    ['transfert 50 € épargne hier', null, 3, 5_000, '2026-11-01'],
    ['virement 80 €', null, null, 8_000],
  ]
  for (const [text, fromId, toId, cents, date] of corpus) {
    test(`« ${text} »`, ({ assert }) => {
      const parsed = parseTransfer(text, accounts, reference)
      assert.equal(parsed.amountCents, cents)
      assert.equal(parsed.fromId, fromId)
      assert.equal(parsed.toId, toId)
      if (date) assert.equal(parsed.occurredOn?.toISODate(), date)
    })
  }
})

test.group('Capture | income corpus', () => {
  const corpus: Array<[string, string, number]> = [
    ['salaire 2100 €', 'Salaire', 210_000],
    ['remboursement sécu 25,30 €', 'Remboursement sécu', 2_530],
    ['vendu le vélo 80 € hier', 'Vendu le vélo', 8_000],
  ]
  for (const [text, label, cents] of corpus) {
    test(`« ${text} »`, ({ assert }) => {
      const parsed = parseExpense(text, reference)
      assert.equal(parsed.label, label)
      assert.equal(parsed.amountCents, cents)
    })
  }
})
