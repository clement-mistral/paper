import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/user'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import EnvelopeService from '#domains/budget/services/envelope_service'
import BankImportService from '#domains/budget/services/bank_import_service'
import { fromIsoDate } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { BankImportDetail } from '#shared/types/budget'

const STATEMENT = [
  'Date;Libellé;Montant',
  '12/11/2026;CB CARREFOUR MARKET 11/11 CARTE 4972;-54,20',
  '13/11/2026;CB CAFÉ DU COIN 12/11;-3,20',
  '14/11/2026;VIR SALAIRE NOVEMBRE;2 450,00',
].join('\n')

async function setup() {
  const accounts = await app.container.make(AccountService)
  const envelopes = await app.container.make(EnvelopeService)
  const account = await accounts.create({ name: 'Compte courant', type: 'checking' })
  const groceries = await envelopes.create({ name: 'Courses', keywords: 'carrefour, leclerc' })
  const outings = await envelopes.create({ name: 'Sorties' })
  /** Typed by hand the day before the bank saw it. */
  const coffee = await Transaction.create({
    accountId: account.id,
    amountCents: -320,
    label: 'Café',
    occurredOn: fromIsoDate('2026-11-12'),
    domain: 'budget',
  })
  await User.create({ email: 'bank@paper.local', password: 'secret123' })
  const browser = new Browser()
  await browser.login('bank@paper.local', 'secret123')
  return { account, groceries, outings, coffee, browser }
}

async function upload(browser: Browser, accountId: number, content: string, name = 'releve.csv') {
  await browser.request(urlFor('bank_imports.create', { id: accountId }))
  const form = new FormData()
  form.append('statement', new Blob([content], { type: 'text/csv' }), name)
  return browser.request(urlFor('bank_imports.store', { id: accountId }), {
    method: 'POST',
    body: form,
  })
}

async function review(browser: Browser, location: string): Promise<BankImportDetail> {
  const page = await browser.page(new URL(location, 'http://x').pathname)
  return page.props.bankImport as BankImportDetail
}

test.group('Budget | bank statement import', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('stages, matches what was typed, proposes envelopes, then records', async ({ assert }) => {
    const { account, groceries, coffee, browser } = await setup()
    const response = await upload(browser, account.id, STATEMENT)
    assert.equal(response.status, 302)
    assert.lengthOf(await Transaction.all(), 1, 'nothing recorded before confirmation')

    const staged = await review(browser, response.headers.get('location')!)
    assert.deepEqual(
      staged.lines.map((line) => [line.displayLabel, line.status, line.envelopeId]),
      [
        ['Carrefour market', 'new', groceries.id],
        ['Café coin', 'matched', null],
        ['Salaire novembre', 'new', null],
      ]
    )
    assert.equal(staged.lines[1].matched?.id, coffee.id)

    const service = await app.container.make(BankImportService)
    const result = await service.confirm(
      account.id,
      staged.id,
      staged.lines
        .filter((line) => line.status === 'new')
        .map((line) => ({ id: line.id, include: true, envelopeId: line.envelopeId }))
    )
    assert.deepEqual(result, { created: 2, confirmed: 1 })

    const rows = await Transaction.query().orderBy('occurred_on').orderBy('id')
    assert.deepEqual(
      rows.map((row) => [row.label, row.amountCents, row.envelopeId, row.bankRef !== null]),
      [
        ['Café', -320, null, true],
        ['Carrefour market', -5420, groceries.id, true],
        ['Salaire novembre', 245000, null, true],
      ]
    )

    // The same statement again: everything is already there.
    const again = await upload(browser, account.id, STATEMENT)
    const second = await review(browser, again.headers.get('location')!)
    assert.deepEqual(
      second.lines.map((line) => line.status),
      ['duplicate', 'duplicate', 'duplicate']
    )
  })

  test('confirming from the page: skipped lines and a learned envelope', async ({ assert }) => {
    const { account, outings, browser } = await setup()
    const response = await upload(browser, account.id, STATEMENT)
    const staged = await review(browser, response.headers.get('location')!)
    const [groceryLine, , salaryLine] = staged.lines

    const confirm = await browser.request(
      urlFor('bank_imports.confirm', { id: account.id, importId: staged.id }),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'text/html' },
        body: JSON.stringify({
          lines: [
            { id: groceryLine.id, include: true, envelopeId: outings.id },
            { id: salaryLine.id, include: false, envelopeId: null },
          ],
        }),
      }
    )
    assert.equal(confirm.status, 302)
    const grocery = await Transaction.findByOrFail('label', 'Carrefour market')
    assert.equal(grocery.envelopeId, outings.id)
    assert.isNull(await Transaction.findBy('label', 'Salaire novembre'))

    // Next statement: Carrefour now goes to « Sorties ».
    const next = await upload(
      browser,
      account.id,
      'Date;Libellé;Montant\n20/11/2026;CB CARREFOUR MARKET 19/11;-12,00\n'
    )
    const proposal = await review(browser, next.headers.get('location')!)
    assert.equal(proposal.lines[0].envelopeId, outings.id)
  })

  test('cancelling a confirmed import undoes it', async ({ assert }) => {
    const { account, coffee, browser } = await setup()
    const service = await app.container.make(BankImportService)
    const staged = await service.stage(account.id, {
      name: 'releve.csv',
      bytes: new TextEncoder().encode(STATEMENT),
    })
    await service.confirm(account.id, staged.id, [])
    assert.lengthOf(await Transaction.all(), 3)

    await browser.request(urlFor('bank_imports.create', { id: account.id }))
    const response = await browser.request(
      urlFor('bank_imports.destroy', { id: account.id, importId: staged.id }),
      { method: 'DELETE' }
    )
    assert.oneOf(response.status, [302, 303])
    const left = await Transaction.all()
    assert.deepEqual(
      left.map((row) => row.id),
      [coffee.id]
    )
    await coffee.refresh()
    assert.isNull(coffee.bankRef, 'the typed one is no longer marked by the bank')
  })

  test('an unreadable file is refused with a clear message', async ({ assert }) => {
    const { account, browser } = await setup()
    const response = await upload(browser, account.id, 'a;b;c\n1;2;3\n')
    assert.equal(response.status, 302)
    const page = (await browser.page(
      urlFor('bank_imports.create', { id: account.id })
    )) as unknown as {
      flash: { error?: string }
    }
    assert.match(page.flash.error ?? '', /Colonnes non reconnues/)
  })
})
