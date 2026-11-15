import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import MealPlan from '#domains/menu/models/meal_plan'
import MealPlanService from '#domains/menu/services/meal_plan_service'
import RecipeService from '#domains/menu/services/recipe_service'
import AddMealToShoppingList from '#domains/lists/listeners/add_meal_to_shopping_list'
import RemoveMealFromShoppingList from '#domains/lists/listeners/remove_meal_from_shopping_list'
import ShoppingService from '#domains/lists/services/shopping_service'
import { weekStart } from '#views/meal_week_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { MealWeek } from '#shared/types/menu'

async function recipesNamed(...names: string[]) {
  const recipes = await app.container.make(RecipeService)
  const created = []
  for (const name of names) {
    created.push(
      await recipes.create({
        name,
        servings: 4,
        ingredients: [{ name: `Ingrédient ${name}`, quantity: 100, unit: 'g', isMain: true }],
      })
    )
  }
  return created
}

async function signIn(email: string) {
  await User.create({ email, password: 'secret123' })
  const browser = new Browser()
  await browser.login(email, 'secret123')
  return browser
}

const nextMonday = () => toIsoDate(weekStart(today()).plus({ weeks: 1 }))

test.group('Menu | week of meals', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('shows the week and proposes a different recipe for each empty dinner', async ({
    assert,
  }) => {
    const [gratin] = await recipesNamed('Gratin', 'Soupe', 'Curry')
    const monday = nextMonday()
    const meals = await app.container.make(MealPlanService)
    await db.transaction((trx) =>
      meals.plan({ recipeId: gratin.id, plannedOn: monday, slot: 'lunch', servings: 3 }, trx)
    )

    const browser = await signIn('week@paper.local')
    const page = await browser.page(`${urlFor('meals.week')}?semaine=${monday}`)
    assert.equal(page.component, 'meals/week')
    const week = page.props.week as MealWeek
    assert.equal(week.start, monday)
    assert.lengthOf(week.days, 7)
    assert.deepEqual(
      week.days[0].meals.lunch.map((meal) => [meal.recipe.name, meal.servings]),
      [['Gratin', 3]]
    )

    const proposed = week.days.map((day) => day.proposal?.recipe.name ?? null)
    assert.deepEqual(proposed.slice(0, 2).sort(), ['Curry', 'Soupe'])
    assert.deepEqual(proposed.slice(2), [null, null, null, null, null])
    assert.notInclude(proposed, 'Gratin', 'already in the week')
  })

  test('a date inside the week opens that week; an invalid one the current week', async ({
    assert,
  }) => {
    const browser = await signIn('week2@paper.local')
    const wednesday = toIsoDate(weekStart(today()).plus({ weeks: 1, days: 2 }))
    let page = await browser.page(`${urlFor('meals.week')}?semaine=${wednesday}`)
    assert.equal((page.props.week as MealWeek).start, nextMonday())

    page = await browser.page(`${urlFor('meals.week')}?semaine=2026-13-45`)
    assert.isTrue((page.props.week as MealWeek).isCurrent)
  })

  test('keeps several proposals at once', async ({ assert }) => {
    const [gratin, soupe] = await recipesNamed('Gratin', 'Soupe')
    const browser = await signIn('week3@paper.local')
    const monday = nextMonday()
    const tuesday = toIsoDate(weekStart(today()).plus({ weeks: 1, days: 1 }))

    const response = await browser.submit(urlFor('meals.store_many'), {
      'meals[0][recipeId]': String(gratin.id),
      'meals[0][plannedOn]': monday,
      'meals[0][slot]': 'dinner',
      'meals[0][servings]': '4',
      'meals[1][recipeId]': String(soupe.id),
      'meals[1][plannedOn]': tuesday,
      'meals[1][slot]': 'dinner',
      'meals[1][servings]': '2',
    })
    assert.equal(response.status, 302)

    const planned = await MealPlan.query().orderBy('planned_on')
    assert.deepEqual(
      planned.map((meal) => [toIsoDate(meal.plannedOn), meal.recipeId, meal.servings]),
      [
        [monday, gratin.id, 4],
        [tuesday, soupe.id, 2],
      ]
    )
  })

  test('taking a meal off the week takes what was not bought off the list', async ({
    assert,
    cleanup,
  }) => {
    const [curry] = await recipesNamed('Curry')
    const recipes = await app.container.make(RecipeService)
    await recipes.update(curry.id, {
      name: 'Curry',
      servings: 4,
      ingredients: [
        { name: 'Riz', quantity: 300, unit: 'g', isMain: true },
        { name: 'Lait de coco', quantity: 40, unit: 'cl' },
      ],
    })
    const meals = await app.container.make(MealPlanService)
    const meal = await db.transaction((trx) =>
      meals.plan({ recipeId: curry.id, plannedOn: nextMonday(), slot: 'dinner', servings: 4 }, trx)
    )
    const addToList = await app.container.make(AddMealToShoppingList)
    await addToList.handle({ mealPlanId: meal.id })
    const shopping = await app.container.make(ShoppingService)
    const items = await shopping.list()
    assert.lengthOf(items, 2)
    await shopping.toggle(items.find((item) => item.label.toLowerCase() === 'riz')!.id)

    const events = emitter.fake()
    cleanup(() => emitter.restore())
    const browser = await signIn('week4@paper.local')
    const response = await browser.request(urlFor('meals.destroy', { id: meal.id }), {
      method: 'DELETE',
    })
    assert.oneOf(response.status, [302, 303])
    assert.isNull(await MealPlan.find(meal.id))
    events.assertEmitted('menu:meal_cancelled', ({ data }) => data.mealPlanId === meal.id)

    const removeFromList = await app.container.make(RemoveMealFromShoppingList)
    await removeFromList.handle({ mealPlanId: meal.id })
    const left = await shopping.list()
    assert.deepEqual(
      left.map((item) => [item.label.toLowerCase(), item.checked]),
      [['riz', true]]
    )
  })
})
