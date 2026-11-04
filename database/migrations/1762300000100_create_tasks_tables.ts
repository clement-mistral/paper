import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Lists module: to-do tasks, their checklist, and the capture journal
 * that makes « Annuler » possible.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('tasks', (table) => {
      table.increments('id').notNullable()
      table.string('title', 200).notNullable()
      table.text('notes').nullable()
      table.date('due_on').nullable()
      /**
       * Optional time of day, `HH:MM`.
       */
      table.string('due_time', 5).nullable()
      table.enum('domain', ['budget', 'maison', 'auto', 'menu']).nullable()
      table.enum('recurrence', ['daily', 'weekly', 'monthly', 'yearly']).nullable()
      table.integer('recurrence_interval').notNullable().defaultTo(1)
      table.timestamp('done_at').nullable()
      /**
       * Automatic tasks point to the item that requires them (a bill to
       * pay, a draft recipe…).
       */
      table.string('source_type', 40).nullable()
      table.integer('source_id').nullable()
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['done_at', 'due_on'])
    })

    /**
     * One automatic task per source, ever: a dismissed task is not
     * recreated.
     */
    this.schema.raw(
      'CREATE UNIQUE INDEX tasks_source_unique ON tasks (source_type, source_id) WHERE source_type IS NOT NULL'
    )

    this.schema.createTable('task_items', (table) => {
      table.increments('id').notNullable()
      table
        .integer('task_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')
      table.string('label', 200).notNullable()
      table.boolean('is_done').notNullable().defaultTo(false)
      table.integer('position').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['task_id'])
    })

    this.schema.createTable('capture_logs', (table) => {
      table.increments('id').notNullable()
      table.text('text').notNullable()
      /**
       * Intents of the capture, several for a multiple capture.
       */
      table.specificType('intents', 'text[]').notNullable()
      /**
       * What the capture created, as `{ type, id }` pairs, so it can be
       * undone.
       */
      table.jsonb('created').notNullable()
      table.timestamp('undone_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('capture_logs')
    this.schema.dropTable('task_items')
    this.schema.dropTable('tasks')
  }
}
