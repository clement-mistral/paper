import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Maison domain: subscriptions and bills. Envelope and account ids point
 * to Budget tables: the link is stored here, but Maison never reads
 * Budget models (it goes through the Budget services).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('subscriptions', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table.integer('price_cents').notNullable()
      table.enum('frequency', ['monthly', 'yearly']).notNullable().defaultTo('monthly')
      table.integer('billing_day').notNullable()
      /**
       * Month of the yearly debit (1-12), empty for monthly ones.
       */
      table.integer('billing_month').nullable()
      table.date('next_billing_on').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table
        .integer('envelope_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('envelopes')
        .onDelete('SET NULL')
      table
        .integer('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['is_active', 'next_billing_on'])
    })

    this.schema.createTable('bills', (table) => {
      table.increments('id').notNullable()
      table.string('provider', 80).notNullable()
      table.integer('amount_cents').notNullable()
      table.date('due_on').notNullable()
      table.date('paid_on').nullable()
      table
        .integer('envelope_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('envelopes')
        .onDelete('SET NULL')
      table
        .integer('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.text('notes').nullable()
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['paid_on', 'due_on'])
    })
  }

  async down() {
    this.schema.dropTable('bills')
    this.schema.dropTable('subscriptions')
  }
}
