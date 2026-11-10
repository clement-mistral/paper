import { test } from '@japa/runner'
import { singularKey } from '#capture/normalizer'
import { PRODUCE, inSeason, produceOf } from '#domains/menu/seasons'

test.group('Menu | seasons', () => {
  test('each month has its fruits and vegetables', ({ assert }) => {
    for (let month = 1; month <= 12; month++) {
      const { vegetables, fruits } = inSeason(month)
      assert.isAtLeast(vegetables.length, 5, `vegetables of ${month}`)
      assert.isAtLeast(fruits.length, 2, `fruits of ${month}`)
    }
    const november = inSeason(11)
    assert.includeMembers(november.vegetables, ['poireau', 'potiron', 'chou de Bruxelles'])
    assert.notInclude(november.vegetables, 'tomate')
    assert.notInclude(november.vegetables, 'carotte', 'all-year produce is not printed')
    assert.lengthOf(new Set(PRODUCE.map((produce) => produce.name)), PRODUCE.length)
  })

  test('an ingredient reads as the longest produce it names', ({ assert }) => {
    const of = (name: string) => produceOf(singularKey(name))?.name ?? null
    assert.equal(of('Blancs de poireaux'), 'poireau')
    assert.equal(of('Choux de Bruxelles'), 'chou de Bruxelles')
    assert.equal(of('Chou-fleur'), 'chou-fleur')
    assert.equal(of('Pommes de terre'), 'pomme de terre')
    assert.equal(of('Pommes'), 'pomme')
    assert.equal(of('Noix de coco râpée'), 'noix de coco')
    assert.equal(of('Petits pois'), 'petit pois')
    assert.isNull(of('Poireautage'))
    assert.isNull(of('Farine'))
  })
})
