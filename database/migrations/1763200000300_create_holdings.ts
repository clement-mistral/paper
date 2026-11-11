import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The lines of an investment account and their operations. The quantity
 * held and the average cost are computed from the operations, never
 * stored. Prices and amounts of the operations are in euros, as paid.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('holdings', (table) => {
      table.increments('id').notNullable()
      table
        .integer('account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('accounts')
        .onDelete('CASCADE')
      /** Yahoo Finance symbol; null for what is not quoted (fonds euros…). */
      table.string('symbol', 20).nullable()
      table.string('name', 120).notNullable()
      /** « stock », « fund », « crypto », « bond », « euro_fund », « other ». */
      table.string('asset_class', 20).notNullable()
      /** Unit value typed by hand, in euros, for a line without quotes. */
      table.decimal('manual_price', 24, 8).nullable()
      table.date('manual_priced_on').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['account_id', 'symbol'])
    })

    this.schema.createTable('investment_operations', (table) => {
      table.increments('id').notNullable()
      table
        .integer('holding_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('holdings')
        .onDelete('CASCADE')
      /** « buy », « sell », « dividend », « fee ». */
      table.string('kind', 10).notNullable()
      table.date('occurred_on').notNullable()
      /** Units bought or sold; null for a dividend or a fee. */
      table.decimal('quantity', 24, 8).nullable()
      /** Price of one unit in euros; null for a dividend or a fee. */
      table.decimal('unit_price', 24, 8).nullable()
      table.integer('fees_cents').notNullable().defaultTo(0)
      /** What left or reached the account's cash, positive cents. */
      table.integer('amount_cents').notNullable()
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['holding_id', 'occurred_on'])
    })
  }

  async down() {
    this.schema.dropTable('investment_operations')
    this.schema.dropTable('holdings')
  }
}
