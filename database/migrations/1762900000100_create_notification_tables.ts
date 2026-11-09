import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Web Push: one subscription per device that accepted notifications, and
 * the reminders of the daily review (time, morning reminder, last sends).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('push_subscriptions', (table) => {
      table.increments('id').notNullable()
      table.text('endpoint').notNullable().unique()
      table.string('p256dh', 255).notNullable()
      table.string('auth', 255).notNullable()
      /** « iPhone · Safari », shown in the profile. */
      table.string('label', 80).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('review_reminder_settings', (table) => {
      table.increments('id').notNullable()
      table.boolean('evening_enabled').notNullable().defaultTo(true)
      /** Local time `HH:MM` (household zone). */
      table.string('evening_time', 5).notNullable().defaultTo('21:00')
      table.boolean('morning_enabled').notNullable().defaultTo(true)
      /** Days the reminders were sent: at most once a day each. */
      table.date('evening_sent_on').nullable()
      table.date('morning_sent_on').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('review_reminder_settings')
    this.schema.dropTable('push_subscriptions')
  }
}
