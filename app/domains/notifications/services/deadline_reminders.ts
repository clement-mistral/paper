import { type DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { urlFor } from '@adonisjs/core/services/url_builder'
import DeadlineReminderSetting from '#domains/notifications/models/deadline_reminder_setting'
import PushService from '#domains/notifications/services/push_service'
import BillService from '#domains/maison/services/bill_service'
import ContractService from '#domains/maison/services/contract_service'
import EquipmentService from '#domains/maison/services/equipment_service'
import EquipmentMaintenanceService from '#domains/maison/services/equipment_maintenance_service'
import MaintenanceService from '#domains/auto/services/maintenance_service'
import TaskService from '#domains/lists/services/task_service'
import InvestmentCalendarService from '#domains/budget/services/investment_calendar_service'
import { formatAmount, formatDate, formatKm } from '#support/format'
import { fromIsoDate, now, toIsoDate } from '#support/dates'
import type { DeadlineReminderSettings, PushMessage } from '#shared/types/notifications'

const DEFAULTS: DeadlineReminderSettings = {
  enabled: true,
  sendTime: '09:00',
  leadDays: 7,
  taskAlerts: true,
}

/** A late deadline is reminded once, if it is at most this many days late. */
const LATE_WINDOW_DAYS = 3
/** The digest is not sent after this hour, unless it is set later. */
const QUIET_HOUR = 22
/** Timed tasks: the alert comes this many minutes before. */
const TASK_ALERT_MINUTES = 15
/** …and is no longer sent this long after the time has passed. */
const TASK_ALERT_GRACE_MINUTES = 30
/** The sent log is pruned after this many days. */
const LOG_RETENTION_DAYS = 60
/** Lines of a digest before « et N autres ». */
const DIGEST_LINES = 4

/**
 * Something with a deadline, from any domain.
 */
export type Deadline = {
  /** The source, `bill:12`. */
  key: string
  /** `YYYY-MM-DD`, or null for a mileage-only maintenance. */
  date: string | null
  /**
   * How close it is as computed by its domain, when that is not only a
   * matter of date (a maintenance due by mileage).
   */
  status?: 'upcoming' | 'overdue'
  title: string
  detail: string | null
  href: string
  /** A bill can be late; a warranty or a notice period just ends. */
  canBeLate: boolean
  /** Only reminded on the day (tasks). */
  dayOnly?: boolean
}

export type Stage = 'advance' | 'eve' | 'day' | 'late'

export type DueDeadline = { deadline: Deadline; stage: Stage; days: number | null }

/**
 * Which reminder a deadline is due for on `day`, if any:
 * - `advance` from `leadDays` days before until two days before;
 * - `eve` the day before; `day` on the day;
 * - `late` up to three days after, for what can be late.
 * Each stage is sent once (see the log), so a deadline created four days
 * ahead still gets its `advance` reminder. Without a matching date, the
 * domain's own status decides (a maintenance due by mileage).
 */
export function stageOf(deadline: Deadline, day: DateTime, leadDays: number): DueDeadline | null {
  const byDate = deadline.date === null ? null : stageByDate(deadline, day, leadDays)
  if (byDate) return byDate
  if (deadline.status === 'overdue' && deadline.canBeLate) {
    return { deadline, stage: 'late', days: null }
  }
  if (deadline.status === 'upcoming' && !deadline.dayOnly && deadline.date === null) {
    return { deadline, stage: 'advance', days: null }
  }
  return null
}

function stageByDate(deadline: Deadline, day: DateTime, leadDays: number): DueDeadline | null {
  const days = Math.round(fromIsoDate(deadline.date!).diff(day.startOf('day'), 'days').days)
  if (days < 0) {
    return deadline.canBeLate && days >= -LATE_WINDOW_DAYS
      ? { deadline, stage: 'late', days }
      : null
  }
  if (days === 0) return { deadline, stage: 'day', days }
  if (deadline.dayOnly) return null
  if (days === 1) return { deadline, stage: 'eve', days }
  if (days <= leadDays) return { deadline, stage: 'advance', days }
  return null
}

/**
 * When a deadline falls, in words: « aujourd’hui », « demain »,
 * « dans 7 jours », « en retard »…
 */
export function whenLabel({ stage, days }: Pick<DueDeadline, 'stage' | 'days'>): string {
  if (stage === 'late') return days === null ? 'en retard' : `en retard de ${-days} j`
  if (stage === 'day') return 'aujourd’hui'
  if (stage === 'eve') return 'demain'
  return days === null ? 'bientôt' : `dans ${days} jours`
}

const STAGE_ORDER: Record<Stage, number> = { late: 0, day: 1, eve: 2, advance: 3 }

/**
 * One notification for all the deadlines due: the deadline itself when
 * there is one, else a list with the most urgent first.
 */
export function digestMessage(due: DueDeadline[], agendaUrl: string): PushMessage {
  const sorted = [...due].sort(
    (a, b) =>
      STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] ||
      (a.days ?? 0) - (b.days ?? 0) ||
      a.deadline.title.localeCompare(b.deadline.title)
  )

  if (sorted.length === 1) {
    const [item] = sorted
    const when = whenLabel(item)
    return {
      title: item.deadline.title,
      body: [when.charAt(0).toUpperCase() + when.slice(1), item.deadline.detail]
        .filter(Boolean)
        .join(' · '),
      url: item.deadline.href,
      tag: 'echeances',
    }
  }

  const lines = sorted
    .slice(0, DIGEST_LINES)
    .map((item) => `${item.deadline.title} : ${whenLabel(item)}`)
  const more = sorted.length - DIGEST_LINES
  if (more > 0) lines.push(more === 1 ? 'et 1 autre' : `et ${more} autres`)
  return {
    title: `${sorted.length} échéances`,
    body: lines.join('\n'),
    url: agendaUrl,
    tag: 'echeances',
  }
}

/**
 * Whether the alert of a timed task is due at `at`: from 15 minutes
 * before until 30 minutes after its time.
 */
export function taskAlertDue(dueOn: string, dueTime: string, at: DateTime): boolean {
  const [hour, minute] = dueTime.split(':').map(Number)
  const time = fromIsoDate(dueOn).set({ hour, minute })
  return (
    at >= time.minus({ minutes: TASK_ALERT_MINUTES }) &&
    at < time.plus({ minutes: TASK_ALERT_GRACE_MINUTES })
  )
}

/**
 * Whether the daily digest may be sent at `at`: from the chosen time
 * until 22:00 (or one hour, when the time is set late).
 */
export function digestWindowOpen(sendTime: string, at: DateTime): boolean {
  const [hour, minute] = sendTime.split(':').map(Number)
  const start = at.startOf('day').set({ hour, minute })
  const quiet = at.startOf('day').set({ hour: QUIET_HOUR })
  const end = quiet > start ? quiet : start.plus({ hours: 1 })
  return at >= start && at < end
}

/**
 * Reminders of deadlines, sent as push notifications by the scheduler
 * (`start/scheduler.ts`) every five minutes. Reads the other domains
 * through their public services.
 */
@inject()
export default class DeadlineReminders {
  constructor(
    private push: PushService,
    private bills: BillService,
    private contracts: ContractService,
    private equipment: EquipmentService,
    private equipmentMaintenances: EquipmentMaintenanceService,
    private maintenances: MaintenanceService,
    private tasks: TaskService,
    private investments: InvestmentCalendarService
  ) {}

  async settings(userId: number): Promise<DeadlineReminderSettings> {
    const row = await DeadlineReminderSetting.findBy('user_id', userId)
    if (!row) return { ...DEFAULTS }
    return {
      enabled: row.enabled,
      sendTime: row.sendTime,
      leadDays: row.leadDays,
      taskAlerts: row.taskAlerts,
    }
  }

  async saveSettings(userId: number, input: DeadlineReminderSettings) {
    const row = await this.row(userId)
    row.merge(input)
    await row.save()
  }

  /**
   * Every deadline the household may want to hear about, from `day`
   * minus the late window onward.
   */
  async deadlines(day: DateTime): Promise<Deadline[]> {
    const from = toIsoDate(day.minus({ days: LATE_WINDOW_DAYS }))
    const horizon = toIsoDate(day.plus({ days: 60 }))
    const [
      bills,
      contracts,
      warranties,
      maintenances,
      equipmentMaintenances,
      tasks,
      contributions,
      milestones,
    ] = await Promise.all([
      this.bills.unpaid(),
      this.contracts.withNotice(),
      this.equipment.warrantiesEndingFrom(from),
      this.maintenances.planned(),
      this.equipmentMaintenances.planned(),
      this.tasks.between(toIsoDate(day), toIsoDate(day)),
      this.investments.occurrences(toIsoDate(day), toIsoDate(day)),
      this.investments.milestones(from, horizon),
    ])

    return [
      ...bills.map((bill) => ({
        key: `bill:${bill.id}`,
        date: bill.dueOn,
        title: `Facture ${bill.provider}`,
        detail: `${formatAmount(bill.amountCents)} à payer`,
        href: urlFor('bills.show', { id: bill.id }),
        canBeLate: true,
      })),
      ...contracts.map((contract) => ({
        key: `contract:${contract.id}`,
        date: contract.noticeBy,
        title: `Préavis « ${contract.name} »`,
        detail: `résilier ou renégocier avant le ${formatDate(fromIsoDate(contract.noticeBy!))}`,
        href: urlFor('contracts.show', { id: contract.id }),
        canBeLate: false,
      })),
      ...warranties.map((item) => ({
        key: `warranty:${item.id}`,
        date: item.warrantyUntil,
        title: `Garantie ${item.name}`,
        detail: `fin le ${formatDate(fromIsoDate(item.warrantyUntil))}`,
        href: urlFor('equipment.show', { id: item.id }),
        canBeLate: false,
      })),
      ...maintenances.map((maintenance) => ({
        key: `maintenance:${maintenance.id}`,
        date: maintenance.dueOn,
        status:
          maintenance.status === 'overdue' || maintenance.status === 'upcoming'
            ? maintenance.status
            : undefined,
        title: `${maintenance.title} ${maintenance.vehicleName}`,
        detail:
          maintenance.dueOdometerKm !== null ? `à ${formatKm(maintenance.dueOdometerKm)}` : null,
        href: urlFor('maintenances.completion', { id: maintenance.id }),
        canBeLate: true,
      })),
      ...equipmentMaintenances
        .filter((maintenance) => maintenance.dueOn !== null)
        .map((maintenance) => ({
          key: `equipment_maintenance:${maintenance.id}`,
          date: maintenance.dueOn,
          title: `${maintenance.label} (${maintenance.equipmentName})`,
          detail: null,
          href: urlFor('equipment_maintenances.completion', { id: maintenance.id }),
          canBeLate: true,
        })),
      ...milestones.map((milestone) => ({
        key: `milestone:${milestone.accountId}`,
        date: milestone.date,
        title: milestone.title,
        detail: milestone.detail,
        href: urlFor('portfolios.show', { id: milestone.accountId }),
        canBeLate: false,
      })),
      /** A contribution is reminded on its day, to record the purchase. */
      ...contributions.map(({ plan, date }) => ({
        key: `investment_plan:${plan.id}`,
        date,
        title: `Versement ${plan.accountName}`,
        detail: [formatAmount(plan.amountCents), plan.holdingName].filter(Boolean).join(' · '),
        href: plan.holdingId
          ? urlFor('portfolios.holdings.show', { id: plan.holdingId })
          : urlFor('portfolios.show', { id: plan.accountId }),
        canBeLate: false,
        dayOnly: true,
      })),
      /**
       * Automatic tasks (a bill to pay, a notice to give) are already
       * reminded through their source; timed tasks get their own alert.
       */
      ...tasks
        .filter((task) => !task.done && !task.automatic && task.dueTime === null)
        .map((task) => ({
          key: `task:${task.id}`,
          date: task.dueOn,
          title: task.title,
          detail: null,
          href: urlFor('tasks.show', { id: task.id }),
          canBeLate: false,
          dayOnly: true,
        })),
    ]
  }

  /**
   * Every person of the household, each with their own settings and
   * devices. Returns how many notifications were sent.
   */
  async run(at: DateTime = now()): Promise<number> {
    if (!this.push.configured) return 0
    await db
      .from('deadline_reminder_logs')
      .where('sent_on', '<', toIsoDate(at.minus({ days: LOG_RETENTION_DAYS })))
      .delete()

    const users = await User.query().select('id').orderBy('id')
    let sent = 0
    for (const user of users) sent += await this.runFor(user.id, at)
    return sent
  }

  /**
   * Sends a person what is due at `at`: the digest of deadlines (once the
   * chosen time has come) and the alerts of timed tasks. Idempotent: each
   * stage is recorded, per person, before sending, and a concurrent run
   * records nothing. Returns how many notifications were sent.
   */
  async runFor(userId: number, at: DateTime = now()): Promise<number> {
    if (!this.push.configured) return 0
    const settings = await this.settings(userId)
    if (!settings.enabled) return 0

    let sent = 0

    if (settings.taskAlerts) {
      const tasks = await this.tasks.between(toIsoDate(at), toIsoDate(at))
      for (const task of tasks) {
        if (task.done || !task.dueOn || !task.dueTime) continue
        if (!taskAlertDue(task.dueOn, task.dueTime, at)) continue
        const claimed = await this.claim(userId, at, [
          { key: `task:${task.id}:${task.dueOn}`, stage: 'time' },
        ])
        if (claimed.size === 0) continue
        await this.push.sendToUser(
          userId,
          {
            title: task.title,
            body: `Prévu à ${task.dueTime}`,
            url: urlFor('tasks.show', { id: task.id }),
            tag: `tache-${task.id}`,
          },
          { ttl: TASK_ALERT_GRACE_MINUTES * 60, urgency: 'high' }
        )
        sent++
      }
    }

    if (digestWindowOpen(settings.sendTime, at)) {
      const deadlines = await this.deadlines(at)
      const due = deadlines
        .map((deadline) => stageOf(deadline, at, settings.leadDays))
        .filter((item): item is DueDeadline => item !== null)
      const keyOf = (item: DueDeadline) => `${item.deadline.key}:${item.deadline.date ?? 'km'}`
      const claimed = await this.claim(
        userId,
        at,
        due.map((item) => ({ key: keyOf(item), stage: item.stage }))
      )
      const fresh = due.filter((item) => claimed.has(`${keyOf(item)}|${item.stage}`))
      if (fresh.length > 0) {
        await this.push.sendToUser(userId, digestMessage(fresh, urlFor('agenda')), {
          ttl: 12 * 3600,
        })
        sent++
      }
    }

    return sent
  }

  /**
   * Records the stages about to be sent to a person and returns those that
   * were not already (`key|stage`). The person is part of the logged key.
   */
  private async claim(
    userId: number,
    at: DateTime,
    entries: Array<{ key: string; stage: string }>
  ): Promise<Set<string>> {
    if (entries.length === 0) return new Set()
    const rows: Array<{ deadline_key: string; stage: string }> = await db
      .table('deadline_reminder_logs')
      .insert(
        entries.map((entry) => ({
          deadline_key: `u${userId}:${entry.key}`,
          stage: entry.stage,
          sent_on: toIsoDate(at),
        }))
      )
      .onConflict(['deadline_key', 'stage'])
      .ignore()
      .returning(['deadline_key', 'stage'])
    const prefix = `u${userId}:`
    return new Set(rows.map((row) => `${row.deadline_key.slice(prefix.length)}|${row.stage}`))
  }

  private async row(userId: number): Promise<DeadlineReminderSetting> {
    const existing = await DeadlineReminderSetting.findBy('user_id', userId)
    return existing ?? DeadlineReminderSetting.create({ ...DEFAULTS, userId })
  }
}
