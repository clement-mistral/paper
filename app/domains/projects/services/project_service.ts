import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import PersonalProject from '#domains/projects/models/personal_project'
import PersonalProjectLink from '#domains/projects/models/personal_project_link'
import PersonalProjectNote from '#domains/projects/models/personal_project_note'
import PersonalProjectTask from '#domains/projects/models/personal_project_task'
import AccountService from '#domains/budget/services/account_service'
import TransactionService from '#domains/budget/services/transaction_service'
import { displayName } from '#services/household_service'
import { toIsoDate } from '#support/dates'
import type { ProjectCard, ProjectDetail, ProjectStatus } from '#shared/types/projects'

/** Expenses of a project are transactions with this source. */
export const PROJECT_SOURCE = 'personal_project'

export type ProjectUpdate = {
  title: string
  description?: string | null
  status: ProjectStatus
  shared?: boolean
  budgetCents?: number | null
}

/**
 * Public service of the Projects module: personal projects with their
 * notes, tasks, links and expenses.
 *
 * A project is seen by its owner only, unless shared with the household;
 * a shared project's content can be edited by everyone, its settings
 * (sharing, deletion) by its owner only. Anything else answers « not
 * found », so a private project does not even show it exists.
 */
@inject()
export default class ProjectService {
  constructor(
    private transactions: TransactionService,
    private accounts: AccountService
  ) {}

  private visible(userId: number): ModelQueryBuilderContract<typeof PersonalProject> {
    return PersonalProject.query().where((query) =>
      query.where('user_id', userId).orWhere('shared', true)
    )
  }

  private async find(userId: number, id: number): Promise<PersonalProject> {
    const project = await this.visible(userId).where('id', id).preload('user').first()
    if (!project) throw new Exception('Projet introuvable', { status: 404 })
    return project
  }

  private async own(userId: number, id: number): Promise<PersonalProject> {
    const project = await this.find(userId, id)
    if (project.userId !== userId) {
      throw new Exception('Seule la personne qui a créé ce projet peut le faire', { status: 403 })
    }
    return project
  }

  async list(userId: number): Promise<ProjectCard[]> {
    const projects = await this.visible(userId)
      .preload('user')
      .withCount('tasks', (query) => query.as('task_count'))
      .withCount('tasks', (query) => query.whereNotNull('done_at').as('task_done_count'))
      .withCount('notes', (query) => query.as('note_count'))
      .orderBy('updated_at', 'desc')
    const spent = await this.transactions.totalsForSources(
      PROJECT_SOURCE,
      projects.map((project) => project.id)
    )
    return projects.map((project) =>
      this.card(project, userId, spent.get(project.id) ?? 0, {
        taskCount: Number(project.$extras.task_count),
        taskDoneCount: Number(project.$extras.task_done_count),
        noteCount: Number(project.$extras.note_count),
      })
    )
  }

  async detail(userId: number, id: number): Promise<ProjectDetail> {
    const project = await this.find(userId, id)
    await project.load((loader) =>
      loader
        .load('notes', (query) => query.preload('createdBy').orderBy('created_at', 'desc'))
        .load('tasks', (query) => query.orderBy('position').orderBy('id'))
        .load('links', (query) => query.orderBy('created_at'))
    )
    const expenses = await this.transactions.forSource(PROJECT_SOURCE, id)
    const spent = expenses.reduce((total, row) => total - row.amountCents, 0)
    return {
      ...this.card(project, userId, spent, {
        taskCount: project.tasks.length,
        taskDoneCount: project.tasks.filter((task) => task.doneAt !== null).length,
        noteCount: project.notes.length,
      }),
      description: project.description,
      notes: project.notes.map((note) => ({
        id: note.id,
        body: note.body,
        author: note.createdBy ? displayName(note.createdBy) : null,
        createdAt: note.createdAt.toISO()!,
      })),
      tasks: project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        done: task.doneAt !== null,
      })),
      links: project.links.map((link) => ({
        id: link.id,
        url: link.url,
        title: link.title,
        host: new URL(link.url).hostname.replace(/^www\./, ''),
      })),
      expenses: expenses.map((row) => ({
        id: row.id,
        label: row.label,
        amountCents: row.amountCents,
        occurredOn: toIsoDate(row.occurredOn),
      })),
    }
  }

  async create(userId: number, title: string): Promise<PersonalProject> {
    return PersonalProject.create({ userId, title, status: 'idea', shared: false })
  }

  /**
   * Everyone who sees the project may edit it; sharing it is its owner's
   * call.
   */
  async update(userId: number, id: number, input: ProjectUpdate) {
    const project = await this.find(userId, id)
    project.merge({
      title: input.title,
      description: input.description || null,
      status: input.status,
      budgetCents: input.budgetCents ?? null,
    })
    if (input.shared !== undefined && project.userId === userId) project.shared = input.shared
    await project.save()
  }

  /**
   * Deletes a project and what it holds; its expenses stay in Argent.
   */
  async delete(userId: number, id: number): Promise<string> {
    const project = await this.own(userId, id)
    await db.transaction(async (trx) => {
      await this.transactions.detachSource(PROJECT_SOURCE, id, trx)
      await project.useTransaction(trx).delete()
    })
    return project.title
  }

  async addNote(userId: number, id: number, body: string) {
    const project = await this.find(userId, id)
    await PersonalProjectNote.create({ personalProjectId: project.id, body, createdById: userId })
    await this.touch(project)
  }

  async updateNote(userId: number, id: number, noteId: number, body: string) {
    const project = await this.find(userId, id)
    const note = await PersonalProjectNote.query()
      .where({ id: noteId, personalProjectId: project.id })
      .firstOrFail()
    note.body = body
    await note.save()
    await this.touch(project)
  }

  async deleteNote(userId: number, id: number, noteId: number) {
    const project = await this.find(userId, id)
    await PersonalProjectNote.query().where({ id: noteId, personalProjectId: project.id }).delete()
  }

  async addTask(userId: number, id: number, title: string) {
    const project = await this.find(userId, id)
    const last = await PersonalProjectTask.query()
      .where('personal_project_id', project.id)
      .max('position as max')
      .first()
    await PersonalProjectTask.create({
      personalProjectId: project.id,
      title,
      position: Number(last?.$extras.max ?? -1) + 1,
    })
    await this.touch(project)
  }

  async toggleTask(userId: number, id: number, taskId: number) {
    const project = await this.find(userId, id)
    const task = await PersonalProjectTask.query()
      .where({ id: taskId, personalProjectId: project.id })
      .firstOrFail()
    task.doneAt = task.doneAt ? null : DateTime.now()
    await task.save()
    await this.touch(project)
  }

  async deleteTask(userId: number, id: number, taskId: number) {
    const project = await this.find(userId, id)
    await PersonalProjectTask.query().where({ id: taskId, personalProjectId: project.id }).delete()
  }

  async addLink(userId: number, id: number, url: string, title: string | null) {
    const project = await this.find(userId, id)
    await PersonalProjectLink.create({ personalProjectId: project.id, url, title: title || null })
    await this.touch(project)
  }

  async deleteLink(userId: number, id: number, linkId: number) {
    const project = await this.find(userId, id)
    await PersonalProjectLink.query().where({ id: linkId, personalProjectId: project.id }).delete()
  }

  /**
   * An expense of the project: a real one, in Argent, on the default
   * account.
   */
  async addExpense(
    userId: number,
    id: number,
    input: { amountCents: number; label: string; occurredOn: string }
  ) {
    const project = await this.find(userId, id)
    await db.transaction(async (trx) => {
      const account = await this.accounts.defaultAccount(trx)
      await this.transactions.recordExpense(
        { ...input, envelopeId: null, accountId: account?.id ?? null },
        trx,
        { sourceType: PROJECT_SOURCE, sourceId: project.id }
      )
    })
    await this.touch(project)
  }

  async deleteExpense(userId: number, id: number, transactionId: number) {
    const project = await this.find(userId, id)
    const expenses = await this.transactions.forSource(PROJECT_SOURCE, project.id)
    if (!expenses.some((row) => row.id === transactionId)) {
      throw new Exception('Dépense introuvable', { status: 404 })
    }
    await db.transaction((trx) => this.transactions.delete(transactionId, trx))
  }

  /** Recently touched projects come first on the board. */
  private async touch(project: PersonalProject) {
    project.updatedAt = DateTime.now()
    await project.save()
  }

  private card(
    project: PersonalProject,
    userId: number,
    spentCents: number,
    counts: { taskCount: number; taskDoneCount: number; noteCount: number }
  ): ProjectCard {
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      shared: project.shared,
      mine: project.userId === userId,
      ownerName: displayName(project.user),
      ...counts,
      budgetCents: project.budgetCents,
      spentCents,
      updatedAt: (project.updatedAt ?? project.createdAt).toISO()!,
    }
  }
}
