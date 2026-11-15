import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Several people in the household: invitations to join it, who did what
 * (task done, item checked, expense recorded), and what is personal
 * (devices, reminder settings, daily review, habits). Existing rows go to
 * the first account, the one that created the household.
 */
const FIRST_USER = '(select min(id) from users)'

const PERSONAL = [
  'push_subscriptions',
  'review_reminder_settings',
  'deadline_reminder_settings',
  'daily_reviews',
  'habits',
] as const

const ATTRIBUTION: Array<[string, string[]]> = [
  ['tasks', ['created_by_id', 'done_by_id']],
  ['shopping_items', ['added_by_id', 'checked_by_id']],
  ['transactions', ['created_by_id']],
]

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('household_invitations', (table) => {
      table.increments('id').notNullable()
      /** SHA-256 of the token sent in the link; the token itself is never stored. */
      table.string('token_hash', 64).notNullable().unique()
      table.integer('created_by_id').notNullable().references('users.id').onDelete('CASCADE')
      table.timestamp('expires_at').notNullable()
      table.timestamp('accepted_at').nullable()
      table.integer('accepted_by_id').nullable().references('users.id').onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    for (const [tableName, columns] of ATTRIBUTION) {
      this.schema.alterTable(tableName, (table) => {
        for (const column of columns) {
          table.integer(column).nullable().references('users.id').onDelete('SET NULL')
        }
      })
    }

    for (const tableName of PERSONAL) {
      this.schema.alterTable(tableName, (table) => {
        table.integer('user_id').nullable().references('users.id').onDelete('CASCADE')
      })
      this.schema.raw(`update ${tableName} set user_id = ${FIRST_USER}`)
    }

    /** One review per person and per day; one settings row per person. */
    this.schema.alterTable('daily_reviews', (table) => {
      table.dropUnique(['day'])
      table.unique(['user_id', 'day'])
    })
    this.schema.alterTable('review_reminder_settings', (table) => {
      table.unique(['user_id'])
    })
    this.schema.alterTable('deadline_reminder_settings', (table) => {
      table.unique(['user_id'])
    })
  }

  async down() {
    /** Back to one person: only the first account's reviews can stay. */
    this.schema.raw(`delete from daily_reviews where user_id is distinct from ${FIRST_USER}`)
    this.schema.raw(
      `delete from review_reminder_settings where user_id is distinct from ${FIRST_USER}`
    )
    this.schema.raw(
      `delete from deadline_reminder_settings where user_id is distinct from ${FIRST_USER}`
    )
    this.schema.alterTable('daily_reviews', (table) => {
      table.dropUnique(['user_id', 'day'])
      table.unique(['day'])
    })
    this.schema.alterTable('review_reminder_settings', (table) => {
      table.dropUnique(['user_id'])
    })
    this.schema.alterTable('deadline_reminder_settings', (table) => {
      table.dropUnique(['user_id'])
    })
    for (const tableName of PERSONAL) {
      this.schema.alterTable(tableName, (table) => {
        table.dropColumn('user_id')
      })
    }
    for (const [tableName, columns] of ATTRIBUTION) {
      this.schema.alterTable(tableName, (table) => {
        for (const column of columns) table.dropColumn(column)
      })
    }
    this.schema.dropTable('household_invitations')
  }
}
