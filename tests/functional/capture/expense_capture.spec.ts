import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import CaptureService from '#capture/capture_service'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import { today } from '#support/dates'
import type { CapturePreview } from '#shared/types/capture'

type ReadyPreview = Extract<CapturePreview, { status: 'ready' | 'incomplete' }>

function field(preview: CapturePreview, key: string) {
  if (preview.status !== 'ready' && preview.status !== 'incomplete') {
    throw new Error(`Expected a preview with fields, got « ${preview.status} »`)
  }
  return (preview as ReadyPreview).fields.find((candidate) => candidate.key === key)
}

test.group('Capture | expense', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function setup() {
    const envelopes = await app.container.make(EnvelopeService)
    const accounts = await app.container.make(AccountService)
    const capture = await app.container.make(CaptureService)

    const resto = await envelopes.create({
      name: 'Resto',
      monthlyBudget: 10000,
      keywords: 'restaurant, kebab',
    })
    const courses = await envelopes.create({ name: 'Courses alimentaires' })
    const account = await accounts.create({ name: 'Compte courant', type: 'checking' })

    return { capture, resto, courses, account }
  }

  test('previews an expense without writing anything', async ({ assert }) => {
    const { capture, resto, account } = await setup()

    const preview = await capture.preview({ text: 'kebab 9 € hier' })

    assert.equal(preview.status, 'ready')
    assert.equal(field(preview, 'amountCents')?.value, 900)
    assert.equal(field(preview, 'label')?.value, 'Kebab')
    assert.equal(field(preview, 'occurredOn')?.value, today().minus({ days: 1 }).toISODate())
    assert.equal(field(preview, 'envelopeId')?.value, resto.id)
    assert.equal(field(preview, 'envelopeId')?.source, 'matched')
    assert.equal(field(preview, 'accountId')?.value, account.id)
    assert.lengthOf(await Transaction.all(), 0)
  })

  test('matches an envelope by fuzzy name when no keyword matches', async ({ assert }) => {
    const { capture, courses } = await setup()

    const preview = await capture.preview({ text: 'courses 54,30 €' })

    assert.equal(field(preview, 'envelopeId')?.value, courses.id)
  })

  test('reports missing fields', async ({ assert }) => {
    const { capture } = await setup()

    const preview = await capture.preview({ text: 'dépense resto' })

    assert.equal(preview.status, 'incomplete')
    assert.deepEqual((preview as ReadyPreview).missing, ['Montant'])
  })

  test('does not understand a sentence without any signal', async ({ assert }) => {
    const { capture } = await setup()

    const preview = await capture.preview({ text: 'bonjour à tous' })

    assert.equal(preview.status, 'unknown')
  })

  test('commits the expense as a negative transaction', async ({ assert }) => {
    const { capture, resto, account } = await setup()

    const { message } = await capture.commit({ text: 'resto 32 €' })

    const [transaction] = await Transaction.all()
    assert.equal(message.replace(/\s/g, ' '), 'Dépense de 32,00 € enregistrée')
    assert.equal(transaction.amountCents, -3200)
    assert.equal(transaction.label, 'Resto')
    assert.equal(transaction.envelopeId, resto.id)
    assert.equal(transaction.accountId, account.id)
    assert.equal(transaction.captureText, 'resto 32 €')
  })

  test('applies corrections from the preview', async ({ assert }) => {
    const { capture, courses } = await setup()

    await capture.commit({
      text: 'resto 32 €',
      overrides: { amountCents: '30,50', label: 'Pizzeria', envelopeId: courses.id },
    })

    const [transaction] = await Transaction.all()
    assert.equal(transaction.amountCents, -3050)
    assert.equal(transaction.label, 'Pizzeria')
    assert.equal(transaction.envelopeId, courses.id)
  })

  test('learns the envelope chosen for a label', async ({ assert }) => {
    const { capture, resto } = await setup()

    const before = await capture.preview({ text: 'boulangerie 3 €' })
    assert.isNull(field(before, 'envelopeId')?.value)

    await capture.commit({ text: 'boulangerie 3 €', overrides: { envelopeId: resto.id } })

    const after = await capture.preview({ text: 'boulangerie 4,20 €' })
    assert.equal(field(after, 'envelopeId')?.value, resto.id)
  })

  test('warns when the envelope budget is exceeded', async ({ assert }) => {
    const { capture } = await setup()

    const preview = await capture.preview({ text: 'restaurant 120 €' })

    const warning = (preview as ReadyPreview).effects.find((effect) => effect.tone === 'warning')
    assert.exists(warning)
    assert.include(warning!.detail ?? '', 'Dépassement')
  })
})
