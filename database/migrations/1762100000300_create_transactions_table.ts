import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table
        .integer('envelope_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('envelopes')
        .onDelete('SET NULL')
      table.string('label', 160).notNullable()
      /**
       * Signed amount in cents: negative for an expense, positive for income.
       */
      table.integer('amount_cents').notNullable()
      table.date('occurred_on').notNullable()
      table.enum('domain', ['budget', 'maison', 'auto', 'menu']).notNullable().defaultTo('budget')
      /**
       * Polymorphic link to the item that produced the transaction
       * (a fuel log, a bill…). Empty for plain expenses.
       */
      table.string('source_type', 40).nullable()
      table.integer('source_id').nullable()
      /**
       * Original universal capture phrase, kept for traceability.
       */
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['occurred_on'])
      table.index(['envelope_id', 'occurred_on'])
      table.index(['account_id'])
      table.index(['source_type', 'source_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
