import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Menu domain: what is in the fridge, the cupboards and the freezer, the
 * movements that changed it (cooked meal, checked shopping item, so the
 * listeners stay idempotent and reversible), and ingredient substitutions.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('pantry_items', (table) => {
      table.increments('id').notNullable()
      table
        .integer('ingredient_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ingredients')
        .onDelete('CASCADE')
      table.enum('location', ['fridge', 'cupboard', 'freezer']).notNullable().defaultTo('cupboard')
      /**
       * Null: « il y en a », quantity unknown.
       */
      table.decimal('quantity', 10, 2).nullable()
      table.string('unit', 16).nullable()
      table.date('expires_on').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['ingredient_id', 'location'])
    })

    this.schema.createTable('pantry_movements', (table) => {
      table.increments('id').notNullable()
      table
        .integer('ingredient_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ingredients')
        .onDelete('CASCADE')
      table.enum('location', ['fridge', 'cupboard', 'freezer']).notNullable()
      /**
       * Signed, in `unit`: negative when a meal consumed it.
       */
      table.decimal('quantity', 10, 2).notNullable()
      table.string('unit', 16).nullable()
      table.string('source_type', 40).notNullable()
      table.integer('source_id').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['source_type', 'source_id', 'ingredient_id', 'location'])
    })

    this.schema.createTable('ingredient_substitutions', (table) => {
      table.increments('id').notNullable()
      table
        .integer('ingredient_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ingredients')
        .onDelete('CASCADE')
      table
        .integer('substitute_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ingredients')
        .onDelete('CASCADE')
      table.string('note', 120).nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['ingredient_id', 'substitute_id'])
    })
  }

  async down() {
    this.schema.dropTable('ingredient_substitutions')
    this.schema.dropTable('pantry_movements')
    this.schema.dropTable('pantry_items')
  }
}
