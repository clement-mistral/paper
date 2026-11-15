import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/user'
import Transaction from '#domains/budget/models/transaction'
import AccountService from '#domains/budget/services/account_service'
import PersonalProject from '#domains/projects/models/personal_project'
import { Browser } from '#tests/helpers/browser'
import type { ProjectCard, ProjectDetail } from '#shared/types/projects'

async function member(email: string, fullName: string) {
  const user = await User.create({ email, fullName, password: 'secret123' })
  const browser = new Browser()
  await browser.login(email, 'secret123')
  await browser.request(urlFor('personal_projects.index'))
  return { user, browser }
}

function send(browser: Browser, method: string, url: string, body: unknown = {}) {
  return browser.request(url, {
    method,
    headers: { 'content-type': 'application/json', 'accept': 'text/html' },
    body: JSON.stringify(body),
  })
}

async function detail(browser: Browser, id: number) {
  const page = await browser.page(urlFor('personal_projects.show', { id }))
  return page.props.project as ProjectDetail
}

async function board(browser: Browser) {
  const page = await browser.page(urlFor('personal_projects.index'))
  return page.props.projects as ProjectCard[]
}

test.group('Projects | personal projects', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('notes, tasks and links of one project', async ({ assert }) => {
    const { browser } = await member('camille@paper.local', 'Camille Durand')
    const created = await send(browser, 'POST', urlFor('personal_projects.store'), {
      title: 'Refaire le jardin',
    })
    assert.equal(created.status, 302)
    const project = await PersonalProject.findByOrFail('title', 'Refaire le jardin')
    const id = project.id

    await send(browser, 'POST', urlFor('personal_projects.tasks.store', { id }), {
      title: 'Acheter des graines',
    })
    await send(browser, 'POST', urlFor('personal_projects.tasks.store', { id }), {
      title: 'Bêcher',
    })
    await send(browser, 'POST', urlFor('personal_projects.notes.store', { id }), {
      body: 'Tomates au fond, côté sud.',
    })
    await send(browser, 'POST', urlFor('personal_projects.links.store', { id }), {
      url: 'https://www.rustica.fr/potager',
      title: 'Potager débutant',
    })
    const refused = await send(browser, 'POST', urlFor('personal_projects.links.store', { id }), {
      url: 'javascript:alert(1)',
    })
    assert.equal(refused.status, 302, 'sent back with an error')

    let shown = await detail(browser, id)
    const [seeds] = shown.tasks
    await send(browser, 'PATCH', urlFor('personal_projects.tasks.toggle', { id, itemId: seeds.id }))
    await send(browser, 'PUT', urlFor('personal_projects.update', { id }), {
      title: 'Refaire le jardin',
      status: 'active',
      description: 'Potager et massif',
    })

    shown = await detail(browser, id)
    assert.equal(shown.status, 'active')
    assert.equal(shown.description, 'Potager et massif')
    assert.deepEqual(
      shown.tasks.map((task) => [task.title, task.done]),
      [
        ['Acheter des graines', true],
        ['Bêcher', false],
      ]
    )
    assert.deepEqual(
      shown.notes.map((note) => [note.body, note.author]),
      [['Tomates au fond, côté sud.', 'Camille Durand']]
    )
    assert.deepEqual(
      shown.links.map((link) => [link.title, link.host]),
      [['Potager débutant', 'rustica.fr']]
    )

    const [card] = await board(browser)
    assert.include(card, { status: 'active', taskCount: 2, taskDoneCount: 1, noteCount: 1 })
  })

  test('private to its owner until shared; sharing is the owner’s call', async ({ assert }) => {
    const { user: camille, browser: camilleBrowser } = await member('c2@paper.local', 'Camille')
    const { browser: lea } = await member('l2@paper.local', 'Léa')
    const project = await PersonalProject.create({
      userId: camille.id,
      title: 'Apprendre la guitare',
      status: 'idea',
      shared: false,
    })
    const id = project.id

    assert.lengthOf(await board(lea), 0)
    const hidden = await lea.request(urlFor('personal_projects.show', { id }))
    assert.equal(hidden.status, 404)
    const sneaky = await send(lea, 'POST', urlFor('personal_projects.notes.store', { id }), {
      body: 'coucou',
    })
    assert.equal(sneaky.status, 404)

    await send(camilleBrowser, 'PUT', urlFor('personal_projects.update', { id }), {
      title: 'Apprendre la guitare',
      status: 'active',
      sharing: true,
      shared: true,
    })
    const [shared] = await board(lea)
    assert.include(shared, { title: 'Apprendre la guitare', mine: false, ownerName: 'Camille' })

    await send(lea, 'POST', urlFor('personal_projects.tasks.store', { id }), {
      title: 'Accorder la guitare',
    })
    await send(lea, 'PUT', urlFor('personal_projects.update', { id }), {
      title: 'Apprendre la guitare',
      status: 'active',
      sharing: true,
    })
    await project.refresh()
    assert.isTrue(project.shared, 'Léa cannot unshare it')
    const deleted = await send(lea, 'DELETE', urlFor('personal_projects.destroy', { id }))
    assert.equal(deleted.status, 403)
    const seenByOwner = await detail(camilleBrowser, id)
    assert.lengthOf(seenByOwner.tasks, 1)

    // Unchecking the box in the owner's form unshares it.
    await send(camilleBrowser, 'PUT', urlFor('personal_projects.update', { id }), {
      title: 'Apprendre la guitare',
      status: 'active',
      sharing: true,
    })
    assert.lengthOf(await board(lea), 0)
  })

  test('expenses are real money; they stay when the project goes', async ({ assert }) => {
    const accounts = await app.container.make(AccountService)
    const account = await accounts.create({ name: 'Courant', type: 'checking', isDefault: true })
    const { browser } = await member('c3@paper.local', 'Camille')
    await send(browser, 'POST', urlFor('personal_projects.store'), { title: 'Vélo' })
    const project = await PersonalProject.findByOrFail('title', 'Vélo')
    const id = project.id
    await send(browser, 'PUT', urlFor('personal_projects.update', { id }), {
      title: 'Vélo',
      status: 'active',
      budget: 300,
    })
    await send(browser, 'POST', urlFor('personal_projects.expenses.store', { id }), {
      label: 'Pneus',
      amount: 89.9,
      occurredOn: '2026-11-10',
    })

    const shown = await detail(browser, id)
    assert.include(shown, { budgetCents: 30_000, spentCents: 8_990 })
    const expense = await Transaction.findByOrFail('label', 'Pneus')
    assert.equal(expense.accountId, account.id)
    assert.equal(expense.amountCents, -8_990)

    await send(browser, 'DELETE', urlFor('personal_projects.destroy', { id }))
    assert.isNull(await PersonalProject.find(id))
    await expense.refresh()
    assert.isNull(expense.sourceType, 'kept in Argent, without its project')
  })
})
