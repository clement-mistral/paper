import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Task from '#domains/lists/models/task'
import TaskItem from '#domains/lists/models/task_item'
import { nextOccurrence } from '#domains/lists/services/recurrence'
import { HOME_ZONE, fromIsoDate, toIsoDate, today } from '#support/dates'
import type { Domain } from '#shared/types/domain'
import type { Recurrence, TaskDetail, TaskRow } from '#shared/types/lists'

export type TaskInput = {
  title: string
  notes?: string | null
  dueOn?: string | null
  dueTime?: string | null
  domain?: Domain | null
  recurrence?: Recurrence | null
  recurrenceInterval?: number
  /** Left as is when omitted (the task form does not show them). */
  isChore?: boolean
  room?: string | null
  items?: string[]
}

/**
 * An automatic task wanted by another domain (a bill to pay…).
 */
export type AutomaticTask = {
  sourceType: string
  sourceId: number
  title: string
  dueOn: string | null
  domain: Domain
}

/**
 * Public service of the Lists module for tasks.
 */
export default class TaskService {
  /**
   * Open tasks (dated first), then the ones done during the last 24 hours.
   */
  async list(): Promise<TaskRow[]> {
    const tasks = await this.query()
      .whereNull('cancelled_at')
      .where((query) =>
        query
          .whereNull('done_at')
          .orWhere('done_at', '>', DateTime.now().minus({ hours: 24 }).toSQL()!)
      )
      .orderByRaw('done_at is not null')
      .orderByRaw('due_on is null')
      .orderBy('due_on')
      .orderByRaw('due_time is null')
      .orderBy('due_time')
      .orderBy('id')
    return tasks.map((task) => this.toRow(task))
  }

  /**
   * Open tasks due on or before `end` (overdue included), for the
   * cross-domain views.
   */
  async dueUntil(end: string): Promise<TaskRow[]> {
    const tasks = await this.query()
      .whereNull('done_at')
      .whereNull('cancelled_at')
      .whereNotNull('due_on')
      .where('due_on', '<=', end)
      .orderBy('due_on')
      .orderBy('due_time')
    return tasks.map((task) => this.toRow(task))
  }

  async between(start: string, end: string): Promise<TaskRow[]> {
    const tasks = await this.query()
      .whereNull('cancelled_at')
      .whereBetween('due_on', [start, end])
      .orderBy('due_on')
      .orderBy('due_time')
    return tasks.map((task) => this.toRow(task))
  }

  async undated(): Promise<TaskRow[]> {
    const tasks = await this.query()
      .whereNull('done_at')
      .whereNull('cancelled_at')
      .whereNull('due_on')
      .orderBy('id')
    return tasks.map((task) => this.toRow(task))
  }

  async detail(
    id: number
  ): Promise<Omit<TaskDetail, 'source'> & { sourceType: string | null; sourceId: number | null }> {
    const task = await Task.query()
      .where('id', id)
      .preload('items', (query) => query.orderBy('position').orderBy('id'))
      .firstOrFail()
    return {
      ...this.toRow(task),
      notes: task.notes,
      items: task.items.map((item) => ({ id: item.id, label: item.label, done: item.isDone })),
      sourceType: task.sourceType,
      sourceId: task.sourceId,
    }
  }

  async create(
    input: TaskInput,
    trx?: TransactionClientContract,
    meta: { captureText?: string } = {}
  ): Promise<Task> {
    const run = async (client: TransactionClientContract) => {
      const task = new Task().useTransaction(client)
      this.fill(task, input)
      task.captureText = meta.captureText ?? null
      await task.save()
      await this.addItems(task.id, input.items ?? [], client)
      return task
    }
    return trx ? run(trx) : db.transaction(run)
  }

  async update(id: number, input: Omit<TaskInput, 'items'>): Promise<Task> {
    const task = await Task.findOrFail(id)
    this.fill(task, input)
    await task.save()
    return task
  }

  /**
   * Checks a task. A recurring task schedules its next occurrence, with a
   * fresh checklist.
   */
  async complete(id: number): Promise<Task | null> {
    return db.transaction(async (trx) => {
      const task = await Task.query({ client: trx })
        .where('id', id)
        .preload('items', (query) => query.orderBy('position'))
        .forUpdate()
        .firstOrFail()
      if (task.doneAt) return null

      task.doneAt = DateTime.now()
      await task.save()

      if (!task.recurrence) return null
      const from = task.dueOn ?? today()
      const next = await Task.create(
        {
          title: task.title,
          notes: task.notes,
          dueOn: nextOccurrence(task.recurrence, task.recurrenceInterval, from, today()),
          dueTime: task.dueTime,
          domain: task.domain,
          recurrence: task.recurrence,
          recurrenceInterval: task.recurrenceInterval,
          isChore: task.isChore,
          room: task.room,
          lastDoneAt: task.doneAt,
        },
        { client: trx }
      )
      await this.addItems(
        next.id,
        task.items.map((item) => item.label),
        trx
      )
      return next
    })
  }

  async reopen(id: number) {
    const task = await Task.findOrFail(id)
    task.doneAt = null
    task.cancelledAt = null
    await task.save()
  }

  /**
   * Moves an open task: to the day after `day`, or to « plus tard » (no
   * date).
   */
  async postpone(id: number, to: 'tomorrow' | 'later', day: string) {
    const task = await Task.findOrFail(id)
    task.dueOn = to === 'tomorrow' ? fromIsoDate(day).plus({ days: 1 }) : null
    if (to === 'later') task.dueTime = null
    await task.save()
  }

  /**
   * Gives up a task. It is kept (crossed out) rather than deleted, and a
   * recurring one does not schedule its next occurrence.
   */
  async cancel(id: number) {
    const task = await Task.findOrFail(id)
    task.cancelledAt = DateTime.now()
    await task.save()
  }

  /**
   * What the daily review of `day` goes through: open tasks due on or
   * before that day, and the tasks closed during that day.
   */
  async forReview(
    day: string
  ): Promise<{ open: TaskRow[]; closed: Array<TaskRow & { cancelled: boolean }> }> {
    const start = fromIsoDate(day)
    const end = start.plus({ days: 1 })
    const [open, closed] = await Promise.all([
      this.dueUntil(day),
      this.query()
        .where((query) =>
          query
            .whereBetween('done_at', [start.toSQL()!, end.toSQL()!])
            .orWhereBetween('cancelled_at', [start.toSQL()!, end.toSQL()!])
        )
        .orderBy('done_at'),
    ])
    return {
      open,
      closed: closed.map((task) => ({ ...this.toRow(task), cancelled: task.cancelledAt !== null })),
    }
  }

  /**
   * Checks or unchecks a task; returns the next occurrence of a recurring
   * task when one was created.
   */
  async toggle(id: number): Promise<Task | null> {
    const task = await Task.findOrFail(id)
    if (!task.doneAt) return this.complete(id)
    await this.reopen(id)
    return null
  }

  async delete(id: number, trx?: TransactionClientContract) {
    const task = await Task.find(id, { client: trx })
    if (task) await task.delete()
  }

  async addItem(taskId: number, label: string) {
    await db.transaction((trx) => this.addItems(taskId, [label], trx))
  }

  async toggleItem(itemId: number) {
    const item = await TaskItem.findOrFail(itemId)
    item.isDone = !item.isDone
    await item.save()
  }

  async removeItem(itemId: number) {
    const item = await TaskItem.findOrFail(itemId)
    await item.delete()
  }

  /**
   * Open household chores, the most urgent first.
   */
  async chores(): Promise<TaskRow[]> {
    const tasks = await this.query()
      .where('is_chore', true)
      .whereNull('done_at')
      .whereNull('cancelled_at')
      .orderByRaw('due_on is null')
      .orderBy('due_on')
      .orderBy('title')
    return tasks.map((task) => this.toRow(task))
  }

  /**
   * Forgets the automatic task of a source, so that the next sync creates
   * a new one (a contract entering a new term).
   */
  async forgetAutomatic(sourceType: string, sourceId: number) {
    await Task.query().where({ sourceType, sourceId }).delete()
  }

  /**
   * The automatic task of a source, if any.
   */
  async automaticFor(sourceType: string, sourceId: number): Promise<TaskRow | null> {
    const task = await this.query().where({ sourceType, sourceId }).first()
    return task ? this.toRow(task) : null
  }

  /**
   * Reconciles automatic tasks with what other domains need. Missing ones
   * are created, the ones no longer needed are checked. A task is never
   * recreated for the same source, even once dismissed.
   */
  async syncAutomatic(
    wanted: AutomaticTask[],
    managedTypes: string[],
    stillPending: AutomaticTask[] = []
  ) {
    await db.transaction(async (trx) => {
      for (const task of wanted) {
        const exists = await Task.query({ client: trx })
          .where({ sourceType: task.sourceType, sourceId: task.sourceId })
          .first()
        if (exists) continue
        await Task.create(
          {
            title: task.title,
            dueOn: task.dueOn ? fromIsoDate(task.dueOn) : null,
            domain: task.domain,
            sourceType: task.sourceType,
            sourceId: task.sourceId,
          },
          { client: trx }
        )
      }

      const keep = new Set(
        [...wanted, ...stillPending].map((task) => `${task.sourceType}:${task.sourceId}`)
      )
      const open = await Task.query({ client: trx })
        .whereIn('source_type', managedTypes)
        .whereNull('done_at')
        .whereNull('cancelled_at')
      for (const task of open) {
        if (!keep.has(`${task.sourceType}:${task.sourceId}`)) {
          task.doneAt = DateTime.now()
          await task.save()
        }
      }
    })
  }

  private query() {
    return Task.query()
      .withCount('items', (query) => query.as('item_count'))
      .withCount('items', (query) => query.where('is_done', true).as('item_done_count'))
  }

  private async addItems(taskId: number, labels: string[], trx: TransactionClientContract) {
    const last = await TaskItem.query({ client: trx })
      .where('task_id', taskId)
      .max('position as max')
      .first()
    let position = Number(last?.$extras.max ?? -1) + 1
    for (const label of labels) {
      if (label.trim() === '') continue
      await TaskItem.create({ taskId, label: label.trim(), position: position++ }, { client: trx })
    }
  }

  private fill(task: Task, input: Omit<TaskInput, 'items'>) {
    task.merge({
      title: input.title,
      notes: input.notes ?? null,
      dueOn: input.dueOn ? fromIsoDate(input.dueOn) : null,
      dueTime: input.dueTime ?? null,
      domain: input.domain ?? null,
      recurrence: input.recurrence ?? null,
      recurrenceInterval: input.recurrenceInterval ?? 1,
    })
    if (input.isChore !== undefined) task.isChore = input.isChore
    if (input.room !== undefined) task.room = input.room || null
  }

  private toRow(task: Task): TaskRow {
    return {
      id: task.id,
      title: task.title,
      dueOn: task.dueOn ? toIsoDate(task.dueOn) : null,
      dueTime: task.dueTime,
      domain: task.domain,
      recurrence: task.recurrence,
      recurrenceInterval: task.recurrenceInterval,
      done: task.doneAt !== null,
      overdue: task.doneAt === null && task.dueOn !== null && task.dueOn < today(),
      automatic: task.sourceType !== null,
      itemCount: Number(task.$extras.item_count ?? 0),
      itemDoneCount: Number(task.$extras.item_done_count ?? 0),
      isChore: task.isChore,
      room: task.room,
      lastDoneOn: task.lastDoneAt ? toIsoDate(task.lastDoneAt.setZone(HOME_ZONE)) : null,
    }
  }
}
