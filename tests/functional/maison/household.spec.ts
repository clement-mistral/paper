import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Task from '#domains/lists/models/task'
import AutomaticTasks from '#domains/lists/services/automatic_tasks'
import TaskService from '#domains/lists/services/task_service'
import ClaimService from '#domains/maison/services/claim_service'
import ContractService from '#domains/maison/services/contract_service'
import HomeService from '#domains/maison/services/home_service'
import ProjectService from '#domains/maison/services/project_service'
import { toIsoDate, today } from '#support/dates'
import { Browser } from '#tests/helpers/browser'
import type { ChoreRow, ChoreSuggestion, HomeDetail } from '#shared/types/maison'

const inDays = (days: number) => toIsoDate(today().plus({ days }))

async function createHome() {
  const homes = await app.container.make(HomeService)
  return homes.create({ name: 'Maison', kind: 'house', occupancy: 'owner' })
}

async function login() {
  await User.create({ email: 'menage@paper.local', password: 'secret123' })
  const browser = new Browser()
  await browser.login('menage@paper.local', 'secret123')
  return browser
}

test.group('Maison | contracts', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a reminder task appears a month before the notice deadline', async ({ assert }) => {
    const contracts = await app.container.make(ContractService)
    const automatic = await app.container.make(AutomaticTasks)
    const contract = await contracts.create({
      name: 'Box internet',
      category: 'internet_phone',
      domain: 'maison',
      commitmentUntil: inDays(40),
      noticeDays: 30,
    })
    const far = await contracts.create({
      name: 'Électricité',
      category: 'energy',
      domain: 'maison',
      commitmentUntil: inDays(200),
      noticeDays: 30,
    })

    await automatic.sync()
    const tasks = await Task.query().where('source_type', 'contract')
    assert.lengthOf(tasks, 1)
    assert.equal(tasks[0].sourceId, contract.id)
    assert.equal(toIsoDate(tasks[0].dueOn!), inDays(10))
    assert.include(tasks[0].title, '« Box internet »')
    assert.notEqual(tasks[0].sourceId, far.id)
  })

  test('a new term replaces the reminder of the previous one', async ({ assert }) => {
    const contracts = await app.container.make(ContractService)
    const automatic = await app.container.make(AutomaticTasks)
    const contract = await contracts.create({
      name: 'Assurance habitation',
      category: 'insurance',
      domain: 'maison',
      commitmentUntil: inDays(20),
      tacitRenewal: true,
      renewalMonths: 12,
      noticeDays: 10,
    })
    await automatic.sync()
    const [first] = await Task.query().where({ sourceType: 'contract', sourceId: contract.id })
    first.doneAt = first.createdAt
    await first.save()

    // The anniversary moves a year later: the old reminder is forgotten.
    await contracts.update(contract.id, {
      name: 'Assurance habitation',
      category: 'insurance',
      domain: 'maison',
      commitmentUntil: inDays(20 + 365),
      tacitRenewal: true,
      renewalMonths: 12,
      noticeDays: 10,
    })
    await automatic.sync()
    assert.lengthOf(await Task.query().where({ sourceType: 'contract', sourceId: contract.id }), 0)
  })

  test('an ended contract closes its reminder', async ({ assert }) => {
    const contracts = await app.container.make(ContractService)
    const automatic = await app.container.make(AutomaticTasks)
    const input = {
      name: 'Mutuelle',
      category: 'health' as const,
      domain: 'budget' as const,
      commitmentUntil: inDays(15),
      noticeDays: 5,
    }
    const contract = await contracts.create(input)
    await automatic.sync()
    await contracts.update(contract.id, { ...input, endedOn: inDays(0) })
    await automatic.sync()

    const [task] = await Task.query().where({ sourceType: 'contract', sourceId: contract.id })
    assert.isNotNull(task.doneAt)
    assert.equal(task.domain, 'budget')
  })
})

test.group('Maison | ménage', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('chores show on the home and remember the last time', async ({ assert }) => {
    const home = await createHome()
    const browser = await login()

    let response = await browser.submit(urlFor('chores.store'), {
      title: 'Arroser les plantes',
      room: 'Salon',
      recurrence: 'weekly',
      recurrenceInterval: '1',
    })
    assert.equal(response.status, 302)
    response = await browser.submit(urlFor('chores.suggest'), { key: 'sheets' })
    assert.equal(response.status, 302)

    let page = await browser.page(urlFor('homes.show', { id: home.id }))
    let chores = page.props.chores as ChoreRow[]
    assert.sameMembers(
      chores.map((chore) => chore.title),
      ['Arroser les plantes', 'Changer les draps']
    )
    const suggestions = page.props.choreSuggestions as ChoreSuggestion[]
    assert.notInclude(
      suggestions.map((suggestion) => suggestion.key),
      'sheets'
    )

    const plants = chores.find((chore) => chore.title === 'Arroser les plantes')!
    const tasks = await app.container.make(TaskService)
    await tasks.toggle(plants.id)

    page = await browser.page(urlFor('homes.show', { id: home.id }))
    chores = page.props.chores as ChoreRow[]
    const next = chores.find((chore) => chore.title === 'Arroser les plantes')!
    assert.notEqual(next.id, plants.id)
    assert.equal(next.room, 'Salon')
    assert.equal(next.lastDoneOn, toIsoDate(today()))
    assert.equal(next.dueOn, inDays(7))
  })

  test('editing a regular task leaves chores untouched', async ({ assert }) => {
    const tasks = await app.container.make(TaskService)
    const chore = await tasks.create({
      title: 'Laver les vitres',
      recurrence: 'monthly',
      recurrenceInterval: 3,
      domain: 'maison',
      isChore: true,
      room: 'Salon',
    })
    await tasks.update(chore.id, { title: 'Laver toutes les vitres', recurrence: 'monthly' })
    await chore.refresh()
    assert.isTrue(chore.isChore)
    assert.equal(chore.room, 'Salon')
  })
})

test.group('Maison | travaux et sinistres', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('project expenses go to Budget and add up on the home', async ({ assert }) => {
    const home = await createHome()
    const projects = await app.container.make(ProjectService)
    const project = await projects.create({
      title: 'Repeindre la chambre',
      status: 'in_progress',
      budgetCents: 30_000,
    })
    await projects.addItem(project.id, 'Acheter la peinture')
    await projects.addExpense(project.id, {
      label: 'Peinture',
      amountCents: 12_000,
      occurredOn: inDays(0),
    })
    await projects.addExpense(project.id, {
      label: 'Rouleaux',
      amountCents: 2_500,
      occurredOn: inDays(0),
    })

    const [transaction] = await db
      .from('transactions')
      .where({ source_type: 'project', source_id: project.id })
      .orderBy('id')
    assert.containsSubset(transaction, {
      label: 'Travaux Repeindre la chambre · Peinture',
      amount_cents: -12_000,
      domain: 'maison',
    })

    const homes = await app.container.make(HomeService)
    const detail: HomeDetail = await homes.detail(home.id)
    assert.containsSubset(detail.projects[0], {
      spentCents: 14_500,
      itemCount: 1,
      itemDoneCount: 0,
    })

    const other = await projects.create({ title: 'Combles', status: 'idea' })
    await assert.rejects(() => projects.removeExpense(other.id, transaction.id))
    await projects.removeExpense(project.id, transaction.id)
    const after = await projects.detail(project.id)
    assert.equal(after.spentCents, 2_500)
  })

  test('a claim is linked to the home and its insurance', async ({ assert }) => {
    const home = await createHome()
    const contracts = await app.container.make(ContractService)
    const claims = await app.container.make(ClaimService)
    const insurance = await contracts.create({
      name: 'Assurance habitation',
      category: 'insurance',
      domain: 'maison',
      provider: 'MAIF',
    })
    await claims.create({
      title: 'Ancien bris de glace',
      occurredOn: '2025-01-10',
      status: 'closed',
    })
    await claims.create({
      title: 'Dégât des eaux',
      occurredOn: '2026-10-20',
      status: 'declared',
      contractId: insurance.id,
      damageCents: 120_000,
    })

    const homes = await app.container.make(HomeService)
    const detail = await homes.detail(home.id)
    assert.deepEqual(
      detail.claims.map((claim) => [claim.title, claim.insurer]),
      [
        ['Dégât des eaux', 'MAIF'],
        ['Ancien bris de glace', null],
      ]
    )
    const contract = await contracts.detail(insurance.id)
    assert.lengthOf(contract.claims, 1)
    assert.deepEqual(await contracts.insurances(), [
      { id: insurance.id, name: 'Assurance habitation' },
    ])
  })

  test('the pages render', async ({ assert }) => {
    await createHome()
    const contracts = await app.container.make(ContractService)
    const contract = await contracts.create({
      name: 'Box',
      category: 'internet_phone',
      domain: 'maison',
    })
    const projects = await app.container.make(ProjectService)
    const project = await projects.create({ title: 'Combles', status: 'idea' })
    const claims = await app.container.make(ClaimService)
    const claim = await claims.create({
      title: 'Grêle',
      occurredOn: '2026-06-01',
      status: 'to_declare',
    })
    const browser = await login()

    const pages: Array<[string, string]> = [
      [urlFor('contracts.index'), 'fiches/contracts/index'],
      [urlFor('contracts.create'), 'fiches/contracts/form'],
      [urlFor('contracts.show', { id: contract.id }), 'fiches/contracts/show'],
      [urlFor('projects.create'), 'fiches/projects/form'],
      [urlFor('projects.show', { id: project.id }), 'fiches/projects/show'],
      [urlFor('claims.create'), 'fiches/claims/form'],
      [urlFor('claims.show', { id: claim.id }), 'fiches/claims/show'],
    ]
    for (const [path, component] of pages) {
      const page = await browser.page(path)
      assert.equal(page.component, component, path)
    }
  })
})
