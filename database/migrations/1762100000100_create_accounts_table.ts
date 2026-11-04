import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table.enum('type', ['checking', 'savings', 'investment']).notNullable()
      table.string('institution', 80).nullable()
      table.integer('opening_balance_cents').notNullable().defaultTo(0)
      table.boolean('is_default').notNullable().defaultTo(false)
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
