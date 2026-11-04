import { test } from '@japa/runner'
import { convert } from '#domains/menu/services/units'
import { mergeLines } from '#domains/menu/services/pantry_service'
import { scoreRecipe, type SuggestionInput } from '#domains/menu/services/suggestion_service'
import {
  extractRecipe,
  isPrivateAddress,
  isoMinutes,
  parseIngredientLine,
} from '#domains/menu/services/recipe_import'
import { toIsoDate, today } from '#support/dates'

test.group('Menu | units', () => {
  test('convert within a family only', ({ assert }) => {
    assert.equal(convert(1.5, 'kg', 'g'), 1500)
    assert.equal(convert(25, 'cl', 'l'), 0.25)
    assert.equal(convert(2, 'cas', 'ml'), 30)
    assert.isNull(convert(200, 'g', 'ml'))
    assert.isNull(convert(2, 'piece', 'g'))
    assert.equal(convert(3, null, 'piece'), 3)
  })

  test('lines of the same ingredient are merged', ({ assert }) => {
    assert.deepEqual(
      mergeLines([
        { ingredientId: 1, quantity: 200, unit: 'g' },
        { ingredientId: 1, quantity: 0.1, unit: 'kg' },
        { ingredientId: 2, quantity: null, unit: null },
      ]),
      [
        { ingredientId: 1, quantity: 300, unit: 'g' },
        { ingredientId: 2, quantity: null, unit: null },
      ]
    )
  })
})

test.group('Menu | suggestion scoring', () => {
  const day = toIsoDate(today())
  const soon = toIsoDate(today().plus({ days: 1 }))
  const carbonara: SuggestionInput = {
    recipe: { id: 1, name: 'Carbonara', servings: 4, totalMinutes: 20 },
    ingredients: [
      { ingredientId: 1, name: 'Pâtes', quantity: 400, unit: 'g', isMain: true, isStaple: false },
      { ingredientId: 2, name: 'Lardons', quantity: 200, unit: 'g', isMain: true, isStaple: false },
      { ingredientId: 3, name: 'Crème', quantity: 20, unit: 'cl', isMain: false, isStaple: false },
      { ingredientId: 4, name: 'Sel', quantity: null, unit: null, isMain: false, isStaple: true },
    ],
    recentlyPlanned: false,
  }
  const names = new Map([[5, 'Crème liquide']])

  test('everything available, with an anti-waste bonus', ({ assert }) => {
    const stock = new Map([
      [1, [{ quantity: 1, unit: 'kg' as const, expiresOn: null }]],
      [2, [{ quantity: 250, unit: 'g' as const, expiresOn: soon }]],
      [3, [{ quantity: null, unit: null, expiresOn: null }]],
    ])
    const result = scoreRecipe(carbonara, stock, new Map(), names, day)
    assert.equal(result.coverage, 1)
    assert.equal(result.score, 115)
    assert.equal(result.reasons[0], 'Tout est disponible')
    assert.match(result.reasons[1], /^Utilise lardons \(\d\d\/\d\d\/\d{4}\) qui périme bientôt$/)
  })

  test('a missing main ingredient weighs more, a substitute softens it', ({ assert }) => {
    const stock = new Map([
      [1, [{ quantity: 400, unit: 'g' as const, expiresOn: null }]],
      [5, [{ quantity: 50, unit: 'cl' as const, expiresOn: null }]],
    ])
    const result = scoreRecipe(carbonara, stock, new Map([[3, [5]]]), names, day)
    assert.deepEqual(result.missing, ['Lardons'])
    assert.deepEqual(result.substitutions, [{ missing: 'Crème', with: 'Crème liquide' }])
    assert.include(result.reasons, 'Faisable en remplaçant crème par crème liquide')
    assert.include(result.reasons, 'Manque : lardons')
    // coverage (2 + 0.5) / 5 = 0.5 → 50, − 20 (lardons, main) − 4 (crème, halved)
    assert.equal(result.score, 26)
  })

  test('not enough is missing, and a recent meal is pushed down', ({ assert }) => {
    const stock = new Map([
      [1, [{ quantity: 100, unit: 'g' as const, expiresOn: null }]],
      [2, [{ quantity: 200, unit: 'g' as const, expiresOn: null }]],
      [3, [{ quantity: 20, unit: 'cl' as const, expiresOn: null }]],
    ])
    const result = scoreRecipe(
      { ...carbonara, recentlyPlanned: true },
      stock,
      new Map(),
      names,
      day
    )
    assert.deepEqual(result.missing, ['Pâtes (pas assez)'])
    assert.include(result.reasons, 'Déjà au menu ces derniers jours')
  })
})

test.group('Menu | recipe import', () => {
  test('ingredient lines', ({ assert }) => {
    const cases: Array<[string, string, number | null, string | null]> = [
      ['200 g de farine', 'Farine', 200, 'g'],
      ['2 cuillères à soupe d’huile d’olive', 'Huile d’olive', 2, 'cas'],
      ['3 œufs', 'Œufs', 3, 'piece'],
      ['½ citron', 'Citron', 0.5, 'piece'],
      ['1,5 kg de pommes de terre (à chair ferme)', 'Pommes de terre', 1.5, 'kg'],
      ['25 cl de crème liquide', 'Crème liquide', 25, 'cl'],
      ['sel, poivre', 'Sel', null, null],
    ]
    for (const [line, name, quantity, unit] of cases) {
      const parsed = parseIngredientLine(line)
      assert.equal(parsed.name, name, line)
      assert.equal(parsed.quantity, quantity, line)
      assert.equal(parsed.unit, unit, line)
    }
  })

  test('durations', ({ assert }) => {
    assert.equal(isoMinutes('PT1H15M'), 75)
    assert.equal(isoMinutes('PT20M'), 20)
    assert.isNull(isoMinutes('PT0M'))
    assert.isNull(isoMinutes(undefined))
  })

  test('schema.org/Recipe in a @graph', ({ assert }) => {
    const html = `<html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[
        {"@type":"WebPage","name":"Blog"},
        {"@type":["Recipe"],"name":"Quiche &amp; lardons","recipeYield":["6 personnes"],
         "prepTime":"PT15M","cookTime":"PT40M",
         "recipeIngredient":["200 g de lardons","3 œufs","20 cl de crème"],
         "recipeInstructions":[{"@type":"HowToStep","text":"Préchauffer le four."},
           {"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Cuire 40 min."}]}]}
      ]}</script></head></html>`
    const recipe = extractRecipe(html, 'https://example.org/quiche')!
    assert.equal(recipe.name, 'Quiche & lardons')
    assert.equal(recipe.servings, 6)
    assert.equal(recipe.prepMinutes, 15)
    assert.equal(recipe.cookMinutes, 40)
    assert.equal(recipe.steps, '1. Préchauffer le four.\n2. Cuire 40 min.')
    assert.deepEqual(
      recipe.ingredients.map((row) => row.name),
      ['Lardons', 'Œufs', 'Crème']
    )
  })

  test('a page without recipe gives nothing', ({ assert }) => {
    assert.isNull(
      extractRecipe('<script type="application/ld+json">{"@type":"Article"}</script>', 'x')
    )
    assert.isNull(extractRecipe('<script type="application/ld+json">{oops</script>', 'x'))
  })

  test('private addresses are refused', ({ assert }) => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '192.168.1.10',
      '172.20.0.1',
      '169.254.1.1',
      '100.101.1.1',
      '::1',
      'fd00::1',
    ]) {
      assert.isTrue(isPrivateAddress(address), address)
    }
    for (const address of ['93.184.216.34', '2606:4700::1111']) {
      assert.isFalse(isPrivateAddress(address), address)
    }
  })
})
