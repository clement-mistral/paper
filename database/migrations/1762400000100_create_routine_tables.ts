import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Daily routine: the evening review of the day, personal habits, and what
 * the review records on other domains (meal outcome, abandoned tasks).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('daily_reviews', (table) => {
      table.increments('id').notNullable()
      table.date('day').notNullable().unique()
      table.boolean('money_confirmed').notNullable().defaultTo(false)
      /**
       * 1 (difficile) to 5 (excellente).
       */
      table.smallint('mood').nullable()
      table.text('note').nullable()
      table.timestamp('completed_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('habits', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('archived_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('habit_checks', (table) => {
      table.increments('id').notNullable()
      table
        .integer('habit_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('habits')
        .onDelete('CASCADE')
      table.date('day').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['habit_id', 'day'])
    })

    this.schema.alterTable('meal_plans', (table) => {
      /**
       * Filled by the daily review: the planned meal was cooked, replaced
       * by something else, or eaten out.
       */
      table.enum('outcome', ['cooked', 'other', 'eaten_out']).nullable()
    })

    this.schema.alterTable('tasks', (table) => {
      table.timestamp('cancelled_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tasks', (table) => {
      table.dropColumn('cancelled_at')
    })
    this.schema.alterTable('meal_plans', (table) => {
      table.dropColumn('outcome')
    })
    this.schema.dropTable('habit_checks')
    this.schema.dropTable('habits')
    this.schema.dropTable('daily_reviews')
  }
}
