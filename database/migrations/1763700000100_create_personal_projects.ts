import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Personal projects (« Projets ») : each belongs to a person and is seen
 * by them only, unless shared with the household. A project holds notes,
 * a checklist of tasks, links, and optionally a budget whose expenses are
 * real transactions (source `personal_project`).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('personal_projects', (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')
      table.string('title', 120).notNullable()
      table.text('description').nullable()
      /** `idea`, `active`, `paused` or `done`. */
      table.string('status', 10).notNullable().defaultTo('idea')
      table.boolean('shared').notNullable().defaultTo(false)
      table.integer('budget_cents').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['user_id', 'status'])
    })

    this.schema.createTable('personal_project_notes', (table) => {
      table.increments('id').notNullable()
      table
        .integer('personal_project_id')
        .notNullable()
        .references('personal_projects.id')
        .onDelete('CASCADE')
      table.text('body').notNullable()
      table.integer('created_by_id').nullable().references('users.id').onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('personal_project_tasks', (table) => {
      table.increments('id').notNullable()
      table
        .integer('personal_project_id')
        .notNullable()
        .references('personal_projects.id')
        .onDelete('CASCADE')
      table.string('title', 200).notNullable()
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('done_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('personal_project_links', (table) => {
      table.increments('id').notNullable()
      table
        .integer('personal_project_id')
        .notNullable()
        .references('personal_projects.id')
        .onDelete('CASCADE')
      table.text('url').notNullable()
      table.string('title', 200).nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('personal_project_links')
    this.schema.dropTable('personal_project_tasks')
    this.schema.dropTable('personal_project_notes')
    this.schema.dropTable('personal_projects')
  }
}
