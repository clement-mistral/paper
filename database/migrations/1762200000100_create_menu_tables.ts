import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Menu domain: ingredient catalogue, recipes and planned meals.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ingredients', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      /**
       * Normalized, singular form used for uniqueness and matching
       * (« Œufs » → « oeuf »).
       */
      table.string('key', 80).notNullable().unique()
      table.string('default_unit', 16).notNullable().defaultTo('piece')
      /**
       * Staples are assumed to always be at home (salt, oil…): never added
       * to the shopping list.
       */
      table.boolean('is_staple').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('recipes', (table) => {
      table.increments('id').notNullable()
      table.string('name', 120).notNullable()
      table.integer('servings').notNullable().defaultTo(4)
      table.integer('prep_minutes').nullable()
      table.integer('cook_minutes').nullable()
      table.text('steps').nullable()
      table.text('notes').nullable()
      /**
       * Created from the universal capture, still to be completed.
       */
      table.boolean('is_draft').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('recipe_ingredients', (table) => {
      table.increments('id').notNullable()
      table
        .integer('recipe_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('recipes')
        .onDelete('CASCADE')
      table
        .integer('ingredient_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ingredients')
        .onDelete('RESTRICT')
      table.decimal('quantity', 10, 2).nullable()
      table.string('unit', 16).nullable()
      table.boolean('is_main').notNullable().defaultTo(false)
      table.integer('position').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['recipe_id'])
    })

    this.schema.createTable('meal_plans', (table) => {
      table.increments('id').notNullable()
      table.date('planned_on').notNullable()
      table.enum('slot', ['lunch', 'dinner']).notNullable()
      table
        .integer('recipe_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('recipes')
        .onDelete('CASCADE')
      table.integer('servings').notNullable()
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['planned_on'])
    })
  }

  async down() {
    this.schema.dropTable('meal_plans')
    this.schema.dropTable('recipe_ingredients')
    this.schema.dropTable('recipes')
    this.schema.dropTable('ingredients')
  }
}
