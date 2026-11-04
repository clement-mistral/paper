import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import TransactionService from '#domains/budget/services/transaction_service'
import FuelService from '#domains/auto/services/fuel_service'
import VehicleService from '#domains/auto/services/vehicle_service'
import TaskService from '#domains/lists/services/task_service'
import BillService from '#domains/maison/services/bill_service'
import SubscriptionService from '#domains/maison/services/subscription_service'
import IngredientService from '#domains/menu/services/ingredient_service'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RecipeService from '#domains/menu/services/recipe_service'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import { renderPage } from '#tests/helpers/ssr'

/**
 * One functional test per page (PROJECT.md §8): every page answers, is the
 * expected Inertia component, and renders without broken values.
 */
async function seed() {
  const accounts = await app.container.make(AccountService)
  const envelopes = await app.container.make(EnvelopeService)
  const transactions = await app.container.make(TransactionService)
  const vehicles = await app.container.make(VehicleService)
  const fuel = await app.container.make(FuelService)
  const tasks = await app.container.make(TaskService)
  const bills = await app.container.make(BillService)
  const subscriptions = await app.container.make(SubscriptionService)
  const recipes = await app.container.make(RecipeService)
  const meals = await app.container.make(MealPlanService)
  const ingredients = await app.container.make(IngredientService)

  const day = toIsoDate(today())
  const account = await accounts.create({
    name: 'Compte courant',
    type: 'checking',
    isDefault: true,
  })
  const envelope = await envelopes.create({ name: 'Courses', monthlyBudget: 40_000 })
  const vehicle = await vehicles.create({ name: 'Clio', fuel: 'e10' })
  const recipe = await recipes.create({
    name: 'Carbonara',
    servings: 2,
    ingredients: [{ name: 'Pâtes', quantity: 200, unit: 'g', isMain: true }],
  })
  const bill = await bills.create({ provider: 'EDF', amountCents: 8_420, dueOn: day })
  const subscription = await subscriptions.create({
    name: 'Box',
    priceCents: 2_999,
    frequency: 'monthly',
    billingDay: 5,
  })
  const task = await tasks.create({ title: 'Appeler le plombier', dueOn: day, domain: 'maison' })
  await db.transaction(async (trx) => {
    await transactions.recordExpense(
      {
        amountCents: 1_250,
        label: 'Marché',
        occurredOn: day,
        envelopeId: envelope.id,
        accountId: account.id,
      },
      trx
    )
    await fuel.log(
      {
        vehicleId: vehicle.id,
        liters: 30,
        totalCents: 5_400,
        odometerKm: 1_000,
        filledOn: day,
        envelopeId: null,
        accountId: account.id,
      },
      trx,
      { vehicleName: vehicle.name }
    )
    await meals.plan({ recipeId: recipe.id, plannedOn: day, slot: 'dinner', servings: 2 }, trx)
  })
  const [ingredient] = await ingredients.list()

  return { account, envelope, vehicle, recipe, bill, subscription, task, ingredient }
}

test.group('Pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('every page answers and renders', async ({ assert }) => {
    const data = await seed()
    await User.create({ fullName: 'Clément', email: 'pages@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('pages@paper.local', 'secret123')

    const pages: Array<[string, string]> = [
      [urlFor('today'), 'today'],
      [urlFor('agenda'), 'agenda'],
      [urlFor('money'), 'money'],
      [urlFor('money.income'), 'money/income'],
      [urlFor('money.transfer'), 'money/transfer'],
      [urlFor('lists'), 'lists'],
      [urlFor('tasks.show', { id: data.task.id }), 'tasks/show'],
      [urlFor('fiches.index'), 'fiches/index'],
      [urlFor('accounts.index'), 'fiches/accounts/index'],
      [urlFor('accounts.create'), 'fiches/accounts/form'],
      [urlFor('accounts.show', { id: data.account.id }), 'fiches/accounts/show'],
      [urlFor('accounts.edit', { id: data.account.id }), 'fiches/accounts/form'],
      [urlFor('envelopes.index'), 'fiches/envelopes/index'],
      [urlFor('envelopes.create'), 'fiches/envelopes/form'],
      [urlFor('envelopes.show', { id: data.envelope.id }), 'fiches/envelopes/show'],
      [urlFor('envelopes.edit', { id: data.envelope.id }), 'fiches/envelopes/form'],
      [urlFor('recipes.index'), 'fiches/recipes/index'],
      [urlFor('recipes.create'), 'fiches/recipes/form'],
      [urlFor('recipes.show', { id: data.recipe.id }), 'fiches/recipes/show'],
      [urlFor('recipes.edit', { id: data.recipe.id }), 'fiches/recipes/form'],
      [urlFor('ingredients.index'), 'fiches/ingredients/index'],
      [urlFor('ingredients.edit', { id: data.ingredient.id }), 'fiches/ingredients/form'],
      [urlFor('vehicles.index'), 'fiches/vehicles/index'],
      [urlFor('vehicles.create'), 'fiches/vehicles/form'],
      [urlFor('vehicles.show', { id: data.vehicle.id }), 'fiches/vehicles/show'],
      [urlFor('vehicles.edit', { id: data.vehicle.id }), 'fiches/vehicles/form'],
      [urlFor('subscriptions.index'), 'fiches/subscriptions/index'],
      [urlFor('subscriptions.create'), 'fiches/subscriptions/form'],
      [urlFor('subscriptions.show', { id: data.subscription.id }), 'fiches/subscriptions/show'],
      [urlFor('subscriptions.edit', { id: data.subscription.id }), 'fiches/subscriptions/form'],
      [urlFor('bills.index'), 'fiches/bills/index'],
      [urlFor('bills.create'), 'fiches/bills/form'],
      [urlFor('bills.show', { id: data.bill.id }), 'fiches/bills/show'],
      [urlFor('bills.edit', { id: data.bill.id }), 'fiches/bills/form'],
      [urlFor('contracts.index'), 'fiches/contracts/index'],
      [urlFor('homes.create'), 'fiches/homes/form'],
      [urlFor('profile.show'), 'profile'],
      [urlFor('changelog'), 'changelog'],
      [urlFor('design'), 'design'],
    ]

    for (const [path, component] of pages) {
      const page = await browser.page(path)
      assert.equal(page.component, component, path)
      const html = await renderPage(page)
      assert.notMatch(html, /NaN|Infinity|>undefined</, path)
    }

    const review = await browser.request(urlFor('reviews.current'))
    assert.equal(review.status, 302)
    const reviewPage = await browser.page(review.headers.get('location')!)
    assert.equal(reviewPage.component, 'review')
  })

  test('guests are sent to the login page', async ({ assert }) => {
    const browser = new Browser()
    for (const path of [
      urlFor('today'),
      urlFor('money'),
      urlFor('lists'),
      urlFor('fiches.index'),
    ]) {
      const response = await browser.request(path)
      assert.equal(response.status, 302, path)
      assert.equal(response.headers.get('location'), urlFor('session.create'), path)
    }
    const login = await browser.page(urlFor('session.create'))
    assert.equal(login.component, 'auth/login')
    const signup = await browser.page(urlFor('new_account.create'))
    assert.equal(signup.component, 'auth/signup')
  })
})
