import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import CaptureService from '#capture/capture_service'
import UndoService from '#capture/services/undo_service'
import User from '#models/user'
import Transaction from '#domains/budget/models/transaction'
import Transfer from '#domains/budget/models/transfer'
import AccountService from '#domains/budget/services/account_service'
import MoneyView from '#views/money_view'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { MoneyOverview } from '#shared/types/budget'

async function setup() {
  const accounts = await app.container.make(AccountService)
  const current = await accounts.create({
    name: 'Compte courant',
    type: 'checking',
    openingBalance: 100_000,
    isDefault: true,
  })
  const savings = await accounts.create({ name: 'Livret A', type: 'savings' })
  return { accounts, current, savings, capture: await app.container.make(CaptureService) }
}

test.group('Money | income and transfers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('« salaire 2100 € » is an income on the default account', async ({ assert }) => {
    const { capture, accounts, current } = await setup()

    const preview = await capture.preview({ text: 'salaire 2100 €' })
    assert.equal(preview.status, 'ready')
    assert.equal(preview.status === 'ready' && preview.intent.name, 'income')

    await capture.commit({ text: 'salaire 2100 €' })
    const [transaction] = await Transaction.all()
    assert.equal(transaction.amountCents, 210_000)
    assert.equal(transaction.accountId, current.id)
    assert.equal(await accounts.balance(current.id), 310_000)
  })

  test('« café 4 € » stays an expense', async ({ assert }) => {
    const { capture } = await setup()
    const preview = await capture.preview({ text: 'café 4 €' })
    assert.equal(preview.status === 'ready' && preview.intent.name, 'expense')
  })

  test('a transfer moves money without being spent or earned', async ({ assert }) => {
    const { capture, accounts, current, savings } = await setup()

    const preview = await capture.preview({ text: 'virement 300 € vers le livret' })
    assert.equal(preview.status === 'ready' && preview.intent.name, 'transfer')

    const receipt = await capture.commit({ text: 'virement 300 € vers le livret' })
    assert.equal(await accounts.balance(current.id), 70_000)
    assert.equal(await accounts.balance(savings.id), 30_000)

    const money = await app.container.make(MoneyView)
    const overview = await money.overview()
    assert.equal(overview.spentThisMonthCents, 0)
    assert.equal(overview.incomeThisMonthCents, 0)
    assert.equal(overview.netWorthCents, 100_000)
    const spending = await money.monthlySpending()
    assert.equal(spending[spending.length - 1].cents, 0)
    assert.deepEqual(
      overview.transactions.map((row) => row.kind),
      ['transfer', 'transfer']
    )

    const undo = await app.container.make(UndoService)
    await undo.undo(receipt.id)
    assert.lengthOf(await Transfer.all(), 0)
    assert.lengthOf(await Transaction.all(), 0)
  })

  test('« virement reçu » is an income, not a transfer', async ({ assert }) => {
    const { capture } = await setup()
    const preview = await capture.preview({ text: 'virement reçu 150 € de maman' })
    assert.equal(preview.status === 'ready' && preview.intent.name, 'income')
  })

  test('the forms record an income and a transfer, deletion removes both legs', async ({
    assert,
  }) => {
    const { current, savings, accounts } = await setup()
    await User.create({ email: 'argent@paper.local', password: 'secret123' })
    const browser = new Browser()
    await browser.login('argent@paper.local', 'secret123')

    let response = await browser.submit(urlFor('money.income.store'), {
      label: 'Remboursement mutuelle',
      amount: '42,50',
      occurredOn: toIsoDate(today()),
      accountId: String(current.id),
    })
    assert.equal(response.status, 302)

    response = await browser.submit(urlFor('money.transfer.store'), {
      fromAccountId: String(current.id),
      toAccountId: String(current.id),
      amount: '10',
      occurredOn: toIsoDate(today()),
    })
    const refused = await browser.page(urlFor('money.transfer'))
    assert.properties(refused.props.errors as object, ['toAccountId'])

    await browser.submit(urlFor('money.transfer.store'), {
      fromAccountId: String(current.id),
      toAccountId: String(savings.id),
      amount: '100',
      occurredOn: toIsoDate(today()),
    })

    const page = await browser.page(urlFor('money'))
    const overview = page.props.overview as MoneyOverview
    assert.equal(overview.incomeThisMonthCents, 4_250)
    assert.equal(overview.spentThisMonthCents, 0)

    const leg = overview.transactions.find((row) => row.kind === 'transfer')!
    assert.isTrue(leg.deletable)
    response = await browser.request(urlFor('money.transactions.destroy', { id: leg.id }), {
      method: 'DELETE',
    })
    assert.equal(response.status, 302)
    assert.lengthOf(await Transfer.all(), 0)
    assert.equal(await accounts.balance(current.id), 104_250)
  })
})
