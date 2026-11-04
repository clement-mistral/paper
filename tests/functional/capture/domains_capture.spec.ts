import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CaptureService from '#capture/capture_service'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import AddMealToShoppingList from '#domains/lists/listeners/add_meal_to_shopping_list'
import ShoppingItem from '#domains/lists/models/shopping_item'
import Bill from '#domains/maison/models/bill'
import Subscription from '#domains/maison/models/subscription'
import SubscriptionService from '#domains/maison/services/subscription_service'
import FuelLog from '#domains/auto/models/fuel_log'
import VehicleService from '#domains/auto/services/vehicle_service'
import MealPlan from '#domains/menu/models/meal_plan'
import Recipe from '#domains/menu/models/recipe'
import Ingredient from '#domains/menu/models/ingredient'
import RecipeService from '#domains/menu/services/recipe_service'
import { today, toIsoDate } from '#support/dates'
import type { CapturePreview } from '#shared/types/capture'

type ReadyPreview = Extract<CapturePreview, { status: 'ready' | 'incomplete' }>

function intentOf(preview: CapturePreview) {
  return preview.status === 'ready' || preview.status === 'incomplete'
    ? preview.intent.name
    : preview.status
}

function field(preview: CapturePreview, key: string) {
  return (preview as ReadyPreview).fields.find((candidate) => candidate.key === key)
}

test.group('Capture | intent resolution', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const cases: Array<[string, string]> = [
    ['café 4,50 €', 'expense'],
    ['courses 54 €', 'expense'],
    ['facture EDF 84,20 € le 15', 'bill'],
    ['netflix 13,49 € par mois le 5', 'subscription'],
    ['plein 38 L 67 €', 'fuel'],
    ['essence 60 €', 'fuel'],
    ['ajoute du lait aux courses', 'shopping_item'],
    ['acheter du pain', 'shopping_item'],
    ['raclette samedi soir', 'meal'],
    ['dîner resto 40 €', 'expense'],
  ]

  for (const [text, expected] of cases) {
    test(`« ${text} » → ${expected}`, async ({ assert }) => {
      const capture = await app.container.make(CaptureService)
      assert.equal(intentOf(await capture.preview({ text })), expected)
    })
  }
})

test.group('Capture | meal', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function carbonara() {
    const recipes = await app.container.make(RecipeService)
    const recipe = await recipes.create({
      name: 'Pâtes carbonara',
      servings: 4,
      ingredients: [
        { name: 'Spaghetti', quantity: 400, unit: 'g', isMain: true },
        { name: 'Lardons', quantity: 200, unit: 'g' },
        { name: 'Œufs', quantity: 4, unit: 'piece' },
        { name: 'Sel' },
      ],
    })
    await Ingredient.query().where('key', 'sel').update({ isStaple: true })
    return recipe
  }

  test('recognizes a known recipe and lists what to buy', async ({ assert }) => {
    const recipe = await carbonara()
    const capture = await app.container.make(CaptureService)

    const preview = await capture.preview({ text: 'carbonara jeudi soir pour 2' })

    assert.equal(preview.status, 'ready')
    assert.equal(field(preview, 'recipeId')?.value, recipe.id)
    assert.equal(field(preview, 'servings')?.value, 2)
    const shopping = (preview as ReadyPreview).effects.find((e) => e.title.startsWith('Courses'))
    assert.equal(shopping?.detail, 'Spaghetti, Lardons, Œufs')
  })

  test('plans the meal and fills the shopping list (staples excluded)', async ({ assert }) => {
    const recipe = await carbonara()
    const capture = await app.container.make(CaptureService)
    const events = emitter.fake()

    await capture.commit({ text: 'carbonara jeudi soir pour 2' })

    const [meal] = await MealPlan.all()
    assert.equal(meal.recipeId, recipe.id)
    assert.equal(meal.slot, 'dinner')
    assert.equal(meal.servings, 2)
    events.assertEmitted('menu:meal_planned')

    const listener = await app.container.make(AddMealToShoppingList)
    await listener.handle({ mealPlanId: meal.id })
    await listener.handle({ mealPlanId: meal.id })

    const items = await ShoppingItem.query().orderBy('id')
    assert.deepEqual(
      items.map((item) => [item.label, item.quantity]),
      [
        ['Spaghetti', 200],
        ['Lardons', 100],
        ['Œufs', 2],
      ]
    )
    assert.equal(items[0].reasonDomain, 'menu')
  })

  test('creates a draft recipe for an unknown dish', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)

    const preview = await capture.preview({ text: 'raclette samedi soir pour 6' })
    assert.equal(field(preview, 'recipeId')?.value, 'new')
    assert.equal(field(preview, 'newRecipeName')?.value, 'Raclette')

    await capture.commit({ text: 'raclette samedi soir pour 6' })

    const recipe = await Recipe.findByOrFail('name', 'Raclette')
    assert.isTrue(recipe.isDraft)
    const meal = await MealPlan.findByOrFail('recipe_id', recipe.id)
    assert.equal(meal.servings, 6)

    const again = await capture.preview({ text: 'raclette dimanche midi' })
    assert.equal(field(again, 'recipeId')?.value, recipe.id)
  })
})

test.group('Capture | shopping list', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('adds items and links known ingredients', async ({ assert }) => {
    const recipes = await app.container.make(RecipeService)
    await recipes.create({ name: 'Omelette', servings: 2, ingredients: [{ name: 'Oeufs' }] })
    const capture = await app.container.make(CaptureService)

    const { message } = await capture.commit({ text: 'ajoute du lait et des œufs aux courses' })

    const items = await ShoppingItem.query().orderBy('id')
    assert.equal(message, '2 articles ajoutés aux courses')
    assert.deepEqual(
      items.map((item) => item.label),
      ['Lait', 'Oeufs']
    )
    assert.isNull(items[0].ingredientId)
    assert.isNotNull(items[1].ingredientId)
  })
})

test.group('Capture | subscription', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates the subscription with its next debit date', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)

    await capture.commit({ text: 'netflix 13,49 € par mois le 5' })

    const subscription = await Subscription.firstOrFail()
    assert.equal(subscription.name, 'Netflix')
    assert.equal(subscription.priceCents, 1349)
    assert.equal(subscription.billingDay, 5)
    assert.isTrue(subscription.nextBillingOn >= today())
    assert.equal(subscription.nextBillingOn.day, 5)
  })

  test('records due debits once, catching up missed months', async ({ assert }) => {
    const accounts = await app.container.make(AccountService)
    const account = await accounts.create({ name: 'Courant', type: 'checking' })
    const subscriptions = await app.container.make(SubscriptionService)
    const subscription = await subscriptions.create({
      name: 'Spotify',
      priceCents: 1099,
      frequency: 'monthly',
      billingDay: 10,
      accountId: account.id,
    })
    await db
      .from('subscriptions')
      .where('id', subscription.id)
      .update({ next_billing_on: toIsoDate(today().minus({ months: 2 }).set({ day: 10 })) })

    const reference = today().set({ day: 10 })
    const first = await subscriptions.chargeDue(reference)
    const second = await subscriptions.chargeDue(reference)

    assert.equal(first, 3)
    assert.equal(second, 0)
    const charges = await Transaction.query().where('source_type', 'subscription')
    assert.lengthOf(charges, 3)
    assert.isTrue(charges.every((charge) => charge.amountCents === -1099))
    assert.isTrue(charges.every((charge) => charge.domain === 'maison'))
    await subscription.refresh()
    assert.equal(toIsoDate(subscription.nextBillingOn), toIsoDate(reference.plus({ months: 1 })))
  })
})

test.group('Capture | bill', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an unpaid bill writes no transaction', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)

    await capture.commit({ text: 'facture EDF 84,20 € le 15' })

    const bill = await Bill.firstOrFail()
    assert.equal(bill.provider, 'EDF')
    assert.isNull(bill.paidOn)
    assert.lengthOf(await Transaction.all(), 0)
  })

  test('a paid bill records the expense in the « Factures » envelope', async ({ assert }) => {
    const envelopeService = await app.container.make(EnvelopeService)
    const envelope = await envelopeService.create({ name: 'Factures' })
    const capture = await app.container.make(CaptureService)

    await capture.commit({ text: 'facture eau 32 € payée hier' })

    const [transaction] = await Transaction.all()
    assert.equal(transaction.amountCents, -3200)
    assert.equal(transaction.envelopeId, envelope.id)
    assert.equal(transaction.sourceType, 'bill')
    assert.equal(toIsoDate(transaction.occurredOn), toIsoDate(today().minus({ days: 1 })))
  })
})

test.group('Capture | fuel', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('logs the fill-up, the odometer and the expense', async ({ assert }) => {
    const vehicles = await app.container.make(VehicleService)
    const vehicle = await vehicles.create({ name: 'Clio', fuel: 'sp95', initialOdometerKm: 142000 })
    const envelopeService = await app.container.make(EnvelopeService)
    await envelopeService.create({ name: 'Carburant' })
    const capture = await app.container.make(CaptureService)

    const preview = await capture.preview({ text: 'plein 38 L 67 € 142 380 km' })
    assert.equal(field(preview, 'vehicleId')?.value, vehicle.id)

    await capture.commit({ text: 'plein 38 L 67 € 142 380 km' })

    const log = await FuelLog.firstOrFail()
    assert.equal(log.liters, 38)
    assert.equal(log.totalCents, 6700)
    const [transaction] = await Transaction.all()
    assert.equal(transaction.domain, 'auto')
    assert.equal(transaction.sourceType, 'fuel_log')
    assert.isNotNull(transaction.envelopeId)
    assert.equal(await vehicles.odometer(vehicle.id), 142380)
  })

  test('asks for the vehicle when none matches', async ({ assert }) => {
    const capture = await app.container.make(CaptureService)

    const preview = await capture.preview({ text: 'plein 38 L 67 €' })

    assert.equal(preview.status, 'incomplete')
    assert.include((preview as ReadyPreview).missing[0], 'Véhicule')
  })
})
