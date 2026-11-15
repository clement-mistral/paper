import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Bank statement imports (CSV, OFX). A statement is first staged line by
 * line and reviewed; nothing reaches the transactions before it is
 * confirmed. `transactions.bank_ref` marks what the bank confirmed (an
 * imported line, or a transaction typed by hand and matched to one), so
 * the same line is never imported twice on an account.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('bank_imports', (table) => {
      table.increments('id').notNullable()
      table.integer('account_id').notNullable().references('accounts.id').onDelete('CASCADE')
      table.string('file_name', 255).notNullable()
      /** `csv` or `ofx`. */
      table.string('format', 8).notNullable()
      /** `pending` (being reviewed) or `done`. */
      table.string('status', 12).notNullable().defaultTo('pending')
      table.integer('created_by_id').nullable().references('users.id').onDelete('SET NULL')
      table.timestamp('confirmed_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('bank_import_lines', (table) => {
      table.increments('id').notNullable()
      table
        .integer('bank_import_id')
        .notNullable()
        .references('bank_imports.id')
        .onDelete('CASCADE')
      table.integer('position').notNullable()
      table.date('occurred_on').notNullable()
      /** As the bank wrote it. */
      table.text('label').notNullable()
      table.integer('amount_cents').notNullable()
      /** OFX FITID, or a hash of the CSV line. */
      table.string('bank_ref', 120).notNullable()
      /** `new`, `matched`, `duplicate`, `skipped` or `imported`. */
      table.string('status', 12).notNullable()
      /** A transaction typed by hand this line confirms. */
      table
        .integer('matched_transaction_id')
        .nullable()
        .references('transactions.id')
        .onDelete('SET NULL')
      /** The envelope proposed, then chosen. */
      table.integer('envelope_id').nullable().references('envelopes.id').onDelete('SET NULL')
      /** The transaction created on confirmation. */
      table.integer('transaction_id').nullable().references('transactions.id').onDelete('SET NULL')
      table.index(['bank_import_id', 'position'])
    })

    this.schema.alterTable('transactions', (table) => {
      table.string('bank_ref', 120).nullable()
    })
    this.schema.raw(
      'create unique index transactions_account_bank_ref_unique on transactions (account_id, bank_ref) where bank_ref is not null'
    )
  }

  async down() {
    this.schema.raw('drop index if exists transactions_account_bank_ref_unique')
    this.schema.alterTable('transactions', (table) => {
      table.dropColumn('bank_ref')
    })
    this.schema.dropTable('bank_import_lines')
    this.schema.dropTable('bank_imports')
  }
}
