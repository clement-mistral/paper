import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Deadline reminders (push notifications): bills, contract notices,
 * maintenances, warranties and the day's tasks. One settings row, and a
 * log of what was sent so that each stage of a deadline (a few days
 * before, the day before, the day itself, late) is sent once.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('deadline_reminder_settings', (table) => {
      table.increments('id').notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      /** Local time `HH:MM` (household zone) of the daily digest. */
      table.string('send_time', 5).notNullable().defaultTo('09:00')
      /** First reminder this many days before a deadline. */
      table.integer('lead_days').notNullable().defaultTo(7)
      /** A notification shortly before a task that has a time. */
      table.boolean('task_alerts').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('deadline_reminder_logs', (table) => {
      table.increments('id').notNullable()
      /** The deadline and its date, `bill:12:2026-11-20`. */
      table.string('deadline_key', 120).notNullable()
      /** `advance`, `eve`, `day`, `late` or `time`. */
      table.string('stage', 10).notNullable()
      table.date('sent_on').notNullable()
      table.unique(['deadline_key', 'stage'])
    })
  }

  async down() {
    this.schema.dropTable('deadline_reminder_logs')
    this.schema.dropTable('deadline_reminder_settings')
  }
}
