import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Maison domain: contracts (energy, internet, insurance…), home projects
 * (travaux) with their checklist, and insurance claims. Lists module:
 * household chores are recurring tasks with a room.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('contracts', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table
        .enum('category', [
          'energy',
          'internet_phone',
          'insurance',
          'health',
          'water',
          'bank',
          'other',
        ])
        .notNullable()
        .defaultTo('other')
      table.enum('domain', ['budget', 'maison', 'auto', 'menu']).notNullable().defaultTo('maison')
      table.string('provider', 80).nullable()
      table.string('customer_number', 60).nullable()
      table.string('contract_number', 60).nullable()
      table.string('contact', 200).nullable()
      table.date('started_on').nullable()
      /**
       * End of the current commitment; with a tacit renewal, the term is
       * rolled forward by `renewal_months`.
       */
      table.date('commitment_until').nullable()
      table.boolean('tacit_renewal').notNullable().defaultTo(false)
      table.integer('renewal_months').nullable()
      table.integer('notice_days').nullable()
      table.date('ended_on').nullable()
      table
        .integer('subscription_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('subscriptions')
        .onDelete('SET NULL')
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('projects', (table) => {
      table.increments('id').notNullable()
      table
        .integer('home_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('homes')
        .onDelete('CASCADE')
      table.string('title', 120).notNullable()
      table
        .enum('status', ['idea', 'planned', 'in_progress', 'done', 'abandoned'])
        .notNullable()
        .defaultTo('idea')
      table.string('room', 80).nullable()
      table.integer('budget_cents').nullable()
      table.date('starts_on').nullable()
      table.date('target_on').nullable()
      table.date('done_on').nullable()
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

      table.index(['home_id', 'status'])
    })

    this.schema.createTable('project_items', (table) => {
      table.increments('id').notNullable()
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
      table.string('label', 200).notNullable()
      table.boolean('is_done').notNullable().defaultTo(false)
      table.integer('position').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['project_id'])
    })

    this.schema.createTable('claims', (table) => {
      table.increments('id').notNullable()
      table
        .integer('home_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('homes')
        .onDelete('CASCADE')
      table
        .integer('contract_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('contracts')
        .onDelete('SET NULL')
      table.string('title', 120).notNullable()
      table.date('occurred_on').notNullable()
      table.date('declared_on').nullable()
      table.string('claim_number', 60).nullable()
      table
        .enum('status', [
          'to_declare',
          'declared',
          'assessment',
          'compensated',
          'refused',
          'closed',
        ])
        .notNullable()
        .defaultTo('to_declare')
      table.integer('damage_cents').nullable()
      table.integer('deductible_cents').nullable()
      table.integer('compensation_cents').nullable()
      table.date('compensated_on').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['home_id', 'status'])
    })

    this.schema.alterTable('tasks', (table) => {
      table.boolean('is_chore').notNullable().defaultTo(false)
      table.string('room', 80).nullable()
      /**
       * When the previous occurrence of a recurring task was done.
       */
      table.timestamp('last_done_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tasks', (table) => {
      table.dropColumn('last_done_at')
      table.dropColumn('room')
      table.dropColumn('is_chore')
    })
    this.schema.dropTable('claims')
    this.schema.dropTable('project_items')
    this.schema.dropTable('projects')
    this.schema.dropTable('contracts')
  }
}
