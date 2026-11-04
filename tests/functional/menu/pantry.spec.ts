import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import PantryItem from '#domains/menu/models/pantry_item'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import PantryService from '#domains/menu/services/pantry_service'
import RecipeService from '#domains/menu/services/recipe_service'
import SuggestionService from '#domains/menu/services/suggestion_service'
import IngredientService from '#domains/menu/services/ingredient_service'
import StockFromShopping from '#domains/menu/listeners/stock_from_shopping'
import ShoppingService from '#domains/lists/services/shopping_service'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { MealSuggestion, PantryRow } from '#shared/types/menu'

async function services() {
  return {
    pantry: await app.container.make(PantryService),
    recipes: await app.container.make(RecipeService),
    meals: await app.container.make(MealPlanService),
    suggestions: await app.container.make(SuggestionService),
    ingredients: await app.container.make(IngredientService),
  }
}

async function carbonara(recipes: RecipeService) {
  return recipes.create({
    name: 'Carbonara',
    servings: 2,
    ingredients: [
      { name: 'Pâtes', quantity: 200, unit: 'g', isMain: true },
      { name: 'Lardons', quantity: 150, unit: 'g', isMain: true },
      { name: 'Crème', quantity: 10, unit: 'cl' },
    ],
  })
}

async function stockOf(name: string) {
  const rows = await PantryItem.query().preload('ingredient')
  return rows.filter((row) => row.ingredient.name === name).map((row) => row.quantity)
}

test.group('Menu | stock', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a cooked meal uses the stock, changing one’s mind gives it back', async ({ assert }) => {
    const { pantry, recipes, meals } = await services()
    const recipe = await carbonara(recipes)
    await pantry.add({ name: 'Pâtes', location: 'cupboard', quantity: 1, unit: 'kg' })
    await pantry.add({ name: 'Lardons', location: 'fridge', quantity: 200, unit: 'g' })

    const meal = await db.transaction((trx) =>
      meals.plan(
        { recipeId: recipe.id, plannedOn: toIsoDate(today()), slot: 'dinner', servings: 4 },
        trx
      )
    )

    await meals.setOutcome(meal.id, 'cooked')
    // 4 servings of a 2-serving recipe: 400 g of pasta, 300 g of lardons.
    assert.deepEqual(await stockOf('Pâtes'), [0.6])
    assert.deepEqual(await stockOf('Lardons'), [])

    await meals.setOutcome(meal.id, 'cooked')
    assert.deepEqual(await stockOf('Pâtes'), [0.6], 'idempotent')

    await meals.setOutcome(meal.id, 'eaten_out')
    assert.deepEqual(await stockOf('Pâtes'), [1])
    assert.deepEqual(await stockOf('Lardons'), [200])
  })

  test('checked shopping goes into the stock, unchecking takes it back', async ({ assert }) => {
    const { pantry, ingredients } = await services()
    await db.transaction((trx) => ingredients.findOrCreate('Lait', trx))
    await pantry.add({ name: 'Lait', location: 'fridge', quantity: 1, unit: 'l' })
    const shopping = await app.container.make(ShoppingService)
    const [item] = await db.transaction((trx) => shopping.add([{ label: 'lait' }], trx))
    const listener = await app.container.make(StockFromShopping)

    const event = {
      itemId: item.id,
      label: 'lait',
      ingredientId: null,
      quantity: 50,
      unit: 'cl',
      checked: true,
    }
    await listener.handle(event)
    await listener.handle(event)
    assert.deepEqual(await stockOf('Lait'), [1.5], 'matched by label, added once')

    await listener.handle({ ...event, checked: false })
    assert.deepEqual(await stockOf('Lait'), [1])
  })

  test('an unknown item is not stocked', async ({ assert }) => {
    const listener = await app.container.make(StockFromShopping)
    await listener.handle({
      itemId: 999,
      label: 'piles AA',
      ingredientId: null,
      quantity: null,
      unit: null,
      checked: true,
    })
    assert.lengthOf(await PantryItem.all(), 0)
  })

  test('suggestions follow the stock and explain themselves', async ({ assert }) => {
    const { pantry, recipes, suggestions, ingredients } = await services()
    const recipe = await carbonara(recipes)
    await recipes.create({
      name: 'Gratin',
      servings: 4,
      ingredients: [{ name: 'Courgettes', quantity: 3, unit: 'piece', isMain: true }],
    })
    await pantry.add({ name: 'Pâtes', location: 'cupboard', quantity: 500, unit: 'g' })
    await pantry.add({
      name: 'Lardons',
      location: 'fridge',
      quantity: 200,
      unit: 'g',
      expiresOn: toIsoDate(today().plus({ days: 1 })),
    })
    await pantry.add({ name: 'Crème liquide', location: 'fridge' })
    const cream = await ingredients.match('crème')
    await ingredients.addSubstitution(cream!.id, 'Crème liquide')

    const [first, ...others] = await suggestions.suggest()
    assert.equal(first.recipe.id, recipe.id)
    assert.include(first.reasons, 'Faisable en remplaçant crème par crème liquide')
    assert.isTrue(first.reasons.some((reason) => reason.startsWith('Utilise lardons')))
    assert.notInclude(
      others.map((suggestion) => suggestion.recipe.name),
      'Gratin',
      'nothing in stock: below the minimum score'
    )
  })
})

test.group('Menu | pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function login() {
    await User.create({ email: 'menu@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('menu@paper.local', 'secret123')
    return browser
  }

  test('the stock is edited from Listes', async ({ assert }) => {
    const browser = await login()
    let response = await browser.submit(urlFor('pantry.store'), {
      name: 'Beurre',
      location: 'fridge',
      quantity: '250',
      unit: 'g',
    })
    assert.equal(response.status, 302)

    let page = await browser.page(urlFor('lists'))
    const [row] = page.props.pantry as PantryRow[]
    assert.containsSubset(row, { name: 'Beurre', location: 'fridge', quantity: 250, unit: 'g' })

    response = await browser.submit(
      urlFor('pantry.update', { id: row.id }),
      { quantity: '0' },
      'PATCH'
    )
    assert.equal(response.status, 302)
    page = await browser.page(urlFor('lists'))
    assert.lengthOf(page.props.pantry as PantryRow[], 0, 'zero removes it')
  })

  test('« Ce soir » plans a suggestion and removes the dinner ideas', async ({ assert }) => {
    const { pantry, recipes } = await services()
    const recipe = await carbonara(recipes)
    await pantry.add({ name: 'Pâtes', location: 'cupboard' })
    await pantry.add({ name: 'Lardons', location: 'fridge' })
    await pantry.add({ name: 'Crème', location: 'fridge' })
    const browser = await login()

    let page = await browser.page(urlFor('today'))
    assert.equal((page.props.dinnerIdeas as MealSuggestion[])[0].recipe.id, recipe.id)
    const index = await browser.page(urlFor('recipes.index'))
    assert.lengthOf(index.props.suggestions as MealSuggestion[], 1)

    const response = await browser.submit(urlFor('recipes.plan', { id: recipe.id }), {
      plannedOn: toIsoDate(today()),
      slot: 'dinner',
      servings: '2',
    })
    assert.equal(response.status, 302)
    page = await browser.page(urlFor('today'))
    assert.lengthOf(page.props.dinnerIdeas as MealSuggestion[], 0)
  })

  test('importing from the local network is refused on the field', async ({ assert }) => {
    const browser = await login()
    const form = await browser.page(urlFor('recipes.import'))
    assert.equal(form.component, 'fiches/recipes/import')

    await browser.submit(urlFor('recipes.import.store'), { url: 'http://127.0.0.1:3333/' })
    const page = await browser.page(urlFor('recipes.import'))
    assert.equal(
      (page.props.errors as Record<string, string>).url,
      'Seuls les sites publics sont accessibles'
    )
  })

  test('substitutions are managed on the ingredient', async ({ assert }) => {
    const { ingredients } = await services()
    const cream = await db.transaction((trx) => ingredients.findOrCreate('Crème', trx))
    const browser = await login()

    await browser.submit(urlFor('ingredients.substitutions.store', { id: cream.id }), {
      name: 'Crème liquide',
    })
    let detail = await ingredients.detail(cream.id)
    assert.deepEqual(
      detail.substitutions.map((row) => row.name),
      ['Crème liquide']
    )

    await browser.request(
      urlFor('ingredients.substitutions.destroy', { substitutionId: detail.substitutions[0].id }),
      { method: 'DELETE' }
    )
    detail = await ingredients.detail(cream.id)
    assert.lengthOf(detail.substitutions, 0)
  })
})
