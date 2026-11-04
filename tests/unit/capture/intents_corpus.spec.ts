import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { parseBill } from '#capture/intents/bill_intent'
import { parseFuel } from '#capture/intents/fuel_intent'
import { parseMeal } from '#capture/intents/meal_intent'
import { parseShoppingItems } from '#capture/intents/shopping_item_intent'
import { parseSubscription } from '#capture/intents/subscription_intent'
import { HOME_ZONE } from '#support/dates'

/**
 * Real phrases for every intent. Reference: Monday 2 November 2026, 9:00
 * in Paris.
 */
const reference = DateTime.fromISO('2026-11-02T09:00:00', { zone: HOME_ZONE })

test.group('Capture | meal corpus', () => {
  const corpus = [
    { text: 'carbonara jeudi soir', dish: 'Carbonara', date: '2026-11-05', slot: 'dinner' },
    { text: 'raclette samedi soir pour 6', dish: 'Raclette', date: '2026-11-07', servings: 6 },
    {
      text: 'midi : salade niçoise demain',
      dish: 'Salade niçoise',
      date: '2026-11-03',
      slot: 'lunch',
    },
    { text: 'on mange une pizza ce soir', dish: 'Pizza', date: '2026-11-02', slot: 'dinner' },
    {
      text: 'repas lasagnes dimanche midi 4 personnes',
      dish: 'Lasagnes',
      date: '2026-11-08',
      servings: 4,
    },
    { text: 'diner curry de lentilles mercredi', dish: 'Curry de lentilles', date: '2026-11-04' },
  ]
  for (const entry of corpus) {
    test(`« ${entry.text} »`, ({ assert }) => {
      const parsed = parseMeal(entry.text, reference)
      assert.equal(parsed.dish, entry.dish)
      assert.equal(parsed.plannedOn?.toISODate(), entry.date)
      if (entry.slot) assert.equal(parsed.slot, entry.slot)
      if (entry.servings) assert.equal(parsed.servings, entry.servings)
    })
  }
})

test.group('Capture | shopping corpus', () => {
  const corpus: Array<[string, string[]]> = [
    ['ajoute du lait et des oeufs aux courses', ['Lait', 'Oeufs']],
    ['acheter du pain', ['Pain']],
    ['courses : pâtes, tomates, parmesan', ['Pâtes', 'Tomates', 'Parmesan']],
    ['il faut racheter du papier toilette', ['Papier toilette']],
    ['ajoute 2 litres de lait à la liste', ['Lait']],
    ['plus de café', ['Café']],
  ]
  for (const [text, labels] of corpus) {
    test(`« ${text} »`, ({ assert }) => {
      assert.deepEqual(
        parseShoppingItems(text).map((item) => item.label),
        labels
      )
    })
  }

  test('reads quantities and units', ({ assert }) => {
    const [milk] = parseShoppingItems('ajoute 2 litres de lait à la liste')
    assert.equal(milk.quantity, 2)
    assert.equal(milk.unit, 'l')
  })
})

test.group('Capture | subscription corpus', () => {
  const corpus = [
    {
      text: 'netflix 13,49 € par mois le 5',
      name: 'Netflix',
      price: 1349,
      frequency: 'monthly',
      day: 5,
    },
    {
      text: 'abonnement salle de sport 30 €',
      name: 'Salle de sport',
      price: 3000,
      frequency: null,
      day: null,
    },
    { text: 'spotify 10,99€/mois', name: 'Spotify', price: 1099, frequency: 'monthly', day: null },
    {
      text: 'assurance habitation 240 € par an le 12 mars',
      name: 'Assurance habitation',
      price: 24000,
      frequency: 'yearly',
      day: 12,
      month: 3,
    },
  ]
  for (const entry of corpus) {
    test(`« ${entry.text} »`, ({ assert }) => {
      const parsed = parseSubscription(entry.text, reference)
      assert.equal(parsed.name, entry.name)
      assert.equal(parsed.priceCents, entry.price)
      assert.equal(parsed.frequency, entry.frequency)
      assert.equal(parsed.billingDay, entry.day)
      if (entry.month) assert.equal(parsed.billingMonth, entry.month)
    })
  }
})

test.group('Capture | bill corpus', () => {
  const corpus = [
    {
      text: 'facture EDF 84,20 € le 15',
      provider: 'EDF',
      amount: 8420,
      date: '2026-11-15',
      paid: false,
    },
    {
      text: 'facture eau 32 € payée hier',
      provider: 'Eau',
      amount: 3200,
      date: '2026-11-01',
      paid: true,
    },
    {
      text: 'facture internet free 29,99 €',
      provider: 'Internet free',
      amount: 2999,
      date: undefined,
      paid: false,
    },
  ]
  for (const entry of corpus) {
    test(`« ${entry.text} »`, ({ assert }) => {
      const parsed = parseBill(entry.text, reference)
      assert.equal(parsed.provider, entry.provider)
      assert.equal(parsed.amountCents, entry.amount)
      assert.equal(parsed.date?.toISODate() ?? undefined, entry.date)
      assert.equal(parsed.paid, entry.paid)
    })
  }
})

test.group('Capture | fuel corpus', () => {
  const corpus = [
    { text: 'plein 38 L 67 €', liters: 38, total: 6700, km: null, fuels: null },
    {
      text: 'gazole 45,2 L 78,90 € 142 380 km',
      liters: 45.2,
      total: 7890,
      km: 142380,
      fuels: ['diesel'],
    },
    { text: 'essence 40 litres 72€ hier', liters: 40, total: 7200, km: null, date: '2026-11-01' },
    { text: 'plein clio 35,5 L 63,20', liters: 35.5, total: 6320, km: null },
  ]
  for (const entry of corpus) {
    test(`« ${entry.text} »`, ({ assert }) => {
      const parsed = parseFuel(entry.text, reference)
      assert.equal(parsed.liters, entry.liters)
      assert.equal(parsed.totalCents, entry.total)
      assert.equal(parsed.odometerKm, entry.km)
      if (entry.fuels !== undefined) assert.deepEqual(parsed.fuels, entry.fuels)
      if (entry.date) assert.equal(parsed.filledOn?.toISODate(), entry.date)
    })
  }
})
