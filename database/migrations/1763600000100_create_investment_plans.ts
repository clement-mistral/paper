import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Scheduled contributions (« versements programmés »): every month, an
 * amount put on an investment account, optionally on one line. They show
 * in the Agenda and the reminders; the purchase itself is recorded by
 * hand, at the price actually paid.
 */
export default class extends BaseSchema {
  protected tableName = 'investment_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('account_id').notNullable().references('accounts.id').onDelete('CASCADE')
      table.integer('holding_id').nullable().references('holdings.id').onDelete('SET NULL')
      table.integer('amount_cents').notNullable()
      /** 1 to 28, so that every month has it. */
      table.integer('day_of_month').notNullable()
      table.date('starts_on').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
