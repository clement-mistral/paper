import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Home from '#domains/maison/models/home'
import Project from '#domains/maison/models/project'
import ProjectItem from '#domains/maison/models/project_item'
import TransactionService from '#domains/budget/services/transaction_service'
import { fromIsoDate, toIsoDate, today } from '#support/dates'
import type { ProjectDetail, ProjectRow, ProjectStatus } from '#shared/types/maison'

export type ProjectInput = {
  title: string
  status: ProjectStatus
  room?: string | null
  budgetCents?: number | null
  startsOn?: string | null
  targetOn?: string | null
  doneOn?: string | null
  envelopeId?: number | null
  accountId?: number | null
  notes?: string | null
}

export type ProjectExpenseInput = {
  label: string
  amountCents: number
  occurredOn: string
}

const SOURCE = 'project'

const ACTIVE: ProjectStatus[] = ['in_progress', 'planned', 'idea']

/**
 * Public service of the Maison domain for home projects (travaux): a
 * budget, a checklist, and expenses recorded in Budget.
 */
@inject()
export default class ProjectService {
  constructor(private transactions: TransactionService) {}

  /**
   * Running projects first (in progress, planned, ideas), then the others.
   */
  async forHome(homeId: number): Promise<ProjectRow[]> {
    const projects = await Project.query()
      .where('home_id', homeId)
      .withCount('items', (query) => query.as('item_count'))
      .withCount('items', (query) => query.where('is_done', true).as('item_done_count'))
      .orderBy('updated_at', 'desc')
    const spent = await this.transactions.totalsForSources(
      SOURCE,
      projects.map((project) => project.id)
    )
    const rank = (status: ProjectStatus) => {
      const index = ACTIVE.indexOf(status)
      return index === -1 ? ACTIVE.length : index
    }
    return projects
      .sort((a, b) => rank(a.status) - rank(b.status))
      .map((project) => this.toRow(project, spent.get(project.id) ?? 0))
  }

  async detail(id: number): Promise<ProjectDetail> {
    const project = await Project.query()
      .where('id', id)
      .preload('items', (query) => query.orderBy('position').orderBy('id'))
      .firstOrFail()
    const transactions = await this.transactions.forSource(SOURCE, id)
    const expenses = transactions.map((transaction) => ({
      id: transaction.id,
      label: transaction.label,
      amountCents: Math.abs(transaction.amountCents),
      occurredOn: toIsoDate(transaction.occurredOn),
    }))
    project.$extras.item_count = project.items.length
    project.$extras.item_done_count = project.items.filter((item) => item.isDone).length
    const date = (value: Project['startsOn']) => (value ? toIsoDate(value) : null)
    return {
      ...this.toRow(
        project,
        expenses.reduce((total, expense) => total + expense.amountCents, 0)
      ),
      homeId: project.homeId,
      startsOn: date(project.startsOn),
      doneOn: date(project.doneOn),
      envelopeId: project.envelopeId,
      accountId: project.accountId,
      notes: project.notes,
      items: project.items.map((item) => ({ id: item.id, label: item.label, done: item.isDone })),
      expenses,
    }
  }

  async create(input: ProjectInput): Promise<Project> {
    const home = await Home.query().orderBy('id').first()
    if (!home) throw new Exception('Créez d’abord le logement', { status: 409 })
    const project = new Project()
    project.homeId = home.id
    this.fill(project, input)
    await project.save()
    return project
  }

  async update(id: number, input: ProjectInput): Promise<Project> {
    const project = await Project.findOrFail(id)
    this.fill(project, input)
    await project.save()
    return project
  }

  /**
   * Removes the project and its checklist; its expenses stay in Budget.
   */
  async delete(id: number): Promise<Project> {
    const project = await Project.findOrFail(id)
    await project.delete()
    return project
  }

  async addItem(projectId: number, label: string) {
    const project = await Project.findOrFail(projectId)
    const last = await ProjectItem.query()
      .where('project_id', project.id)
      .max('position as max')
      .first()
    await ProjectItem.create({
      projectId: project.id,
      label,
      position: Number(last?.$extras.max ?? -1) + 1,
    })
  }

  async toggleItem(itemId: number): Promise<ProjectItem> {
    const item = await ProjectItem.findOrFail(itemId)
    item.isDone = !item.isDone
    await item.save()
    return item
  }

  async removeItem(itemId: number): Promise<ProjectItem> {
    const item = await ProjectItem.findOrFail(itemId)
    await item.delete()
    return item
  }

  /**
   * Records an expense of the project in Budget, on its envelope and
   * account.
   */
  async addExpense(
    projectId: number,
    input: ProjectExpenseInput,
    client?: TransactionClientContract,
    meta: { captureText?: string } = {}
  ) {
    const run = async (trx: TransactionClientContract) => {
      const project = await Project.findOrFail(projectId, { client: trx })
      return this.transactions.recordExpense(
        {
          amountCents: input.amountCents,
          label: `Travaux ${project.title} · ${input.label}`,
          occurredOn: input.occurredOn,
          envelopeId: project.envelopeId,
          accountId: project.accountId,
        },
        trx,
        {
          domain: 'maison',
          sourceType: SOURCE,
          sourceId: project.id,
          captureText: meta.captureText,
        }
      )
    }
    return client ? run(client) : db.transaction(run)
  }

  /**
   * Running projects, for the capture (« travaux peinture 45 € »).
   */
  async running(): Promise<Array<{ id: number; title: string }>> {
    const projects = await Project.query()
      .whereIn('status', ['in_progress', 'planned', 'idea'])
      .orderBy('updated_at', 'desc')
    return projects.map(({ id, title }) => ({ id, title }))
  }

  /**
   * Removes an expense of the project (only one of its own).
   */
  async removeExpense(projectId: number, transactionId: number) {
    await db.transaction(async (trx) => {
      const expenses = await this.transactions.forSource(SOURCE, projectId)
      if (!expenses.some((expense) => expense.id === transactionId)) {
        throw new Exception('Dépense introuvable', { status: 404 })
      }
      await this.transactions.delete(transactionId, trx)
    })
  }

  private fill(project: Project, input: ProjectInput) {
    const date = (value: string | null | undefined) => (value ? fromIsoDate(value) : null)
    project.merge({
      title: input.title,
      status: input.status,
      room: input.room || null,
      budgetCents: input.budgetCents || null,
      startsOn: date(input.startsOn),
      targetOn: date(input.targetOn),
      doneOn: input.status === 'done' ? (date(input.doneOn) ?? project.doneOn ?? today()) : null,
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId ?? null,
      notes: input.notes || null,
    })
  }

  private toRow(project: Project, spentCents: number): ProjectRow {
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      room: project.room,
      budgetCents: project.budgetCents,
      spentCents,
      targetOn: project.targetOn ? toIsoDate(project.targetOn) : null,
      itemCount: Number(project.$extras.item_count ?? 0),
      itemDoneCount: Number(project.$extras.item_done_count ?? 0),
    }
  }
}
