import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Budget domain: a transfer between two accounts (current → savings). It
 * is booked as two transactions (`source_type = 'transfer'`), a debit and
 * a credit, which count neither as an expense nor as income.
 */
export default class extends BaseSchema {
  protected tableName = 'transfers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('from_account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('accounts')
        .onDelete('CASCADE')
      table
        .integer('to_account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('accounts')
        .onDelete('CASCADE')
      table.integer('amount_cents').notNullable()
      table.date('occurred_on').notNullable()
      table.string('label', 160).notNullable()
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
