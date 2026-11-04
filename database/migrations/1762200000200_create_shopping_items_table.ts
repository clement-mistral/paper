import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'shopping_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('ingredient_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('ingredients')
        .onDelete('SET NULL')
      table.string('label', 120).notNullable()
      table.decimal('quantity', 10, 2).nullable()
      table.string('unit', 16).nullable()
      /**
       * Domain that put the item on the list (`menu` for a planned meal),
       * empty when added by hand.
       */
      table.enum('reason_domain', ['budget', 'maison', 'auto', 'menu']).nullable()
      table.string('reason', 160).nullable()
      table.string('source_type', 40).nullable()
      table.integer('source_id').nullable()
      table.timestamp('checked_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    /**
     * Makes the « meal planned » listener idempotent.
     */
    this.schema.raw(
      'CREATE UNIQUE INDEX shopping_items_source_unique ON shopping_items (source_type, source_id, label) WHERE source_type IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
