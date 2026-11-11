import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Quoted values (Yahoo Finance symbols) and their daily closes, kept so
 * that a portfolio can be valued on any past day, even offline.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('market_instruments', (table) => {
      table.string('symbol', 20).primary()
      table.string('name', 120).nullable()
      /** « stock », « fund », « crypto », « index », « currency », « commodity ». */
      table.string('kind', 20).notNullable()
      /** Currency of the closes (« EUR », « USD », « GBp »). */
      table.string('currency', 10).nullable()
      table.timestamp('fetched_at').nullable()
      table.text('last_error').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('price_quotes', (table) => {
      table
        .string('symbol', 20)
        .notNullable()
        .references('symbol')
        .inTable('market_instruments')
        .onDelete('CASCADE')
      table.date('day').notNullable()
      /** In the instrument's currency. */
      table.decimal('close', 24, 8).notNullable()

      table.primary(['symbol', 'day'])
    })
  }

  async down() {
    this.schema.dropTable('price_quotes')
    this.schema.dropTable('market_instruments')
  }
}
