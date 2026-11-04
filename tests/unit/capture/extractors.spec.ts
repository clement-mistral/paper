import { test } from '@japa/runner'
import { cleanLabel, extractAmount } from '#capture/extractors'
import { normalize } from '#capture/normalizer'
import { tokenMatches } from '#capture/scorer'

test.group('Capture extractors | amount', () => {
  const cases: Array<[string, number | null, boolean?]> = [
    ['café 4,50 €', 450, true],
    ['café 4.50€', 450, true],
    ['cinéma 2€50', 250, true],
    ['loyer 1 200 €', 120000, true],
    ['loyer 1 200,00 €', 120000, true],
    ['resto 32 euros', 3200, true],
    ['pain 1 eur', 100, true],
    ['boulangerie 3', 300, false],
    ['boulangerie 3,20', 320, false],
    ['plein 38 L 67 €', 6700, true],
    ['acheter du pain', null],
    ['2 cafés 3 croissants', null],
  ]

  for (const [text, cents, explicit] of cases) {
    test(`« ${text} »`, ({ assert }) => {
      const match = extractAmount(text)
      assert.equal(match?.cents ?? null, cents)
      if (explicit !== undefined) assert.equal(match?.explicit, explicit)
    })
  }
})

test.group('Capture extractors | label', () => {
  const cases: Array<[string, string]> = [
    ['café', 'Café'],
    ["j'ai payé à la pharmacie", 'Pharmacie'],
    ['dépense courses', 'Courses'],
    ['resto avec Paul', 'Resto avec Paul'],
    ['un kebab', 'Kebab'],
  ]

  for (const [text, label] of cases) {
    test(`« ${text} » → « ${label} »`, ({ assert }) => {
      assert.equal(cleanLabel(text), label)
    })
  }
})

test.group('Capture normalizer and scorer', () => {
  test('normalizes accents, case and punctuation', ({ assert }) => {
    assert.equal(normalize("  J'ai payé 4,50 € au Café ! "), 'j ai paye 4 50 au cafe')
  })

  test('tolerates one typo on long keywords only', ({ assert }) => {
    assert.isTrue(tokenMatches('depnse', 'depense'))
    assert.isTrue(tokenMatches('depense', 'depense'))
    assert.isFalse(tokenMatches('paie', 'paye'))
    assert.isFalse(tokenMatches('dpns', 'depense'))
  })
})
