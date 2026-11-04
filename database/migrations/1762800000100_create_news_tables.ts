import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * « Journal du jour » : news feeds the household follows (RSS / Atom),
 * the articles fetched from them (kept 7 days, longer when picked), the
 * articles picked for each day's sheet, and the sheet settings.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('news_sources', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table.string('url', 500).notNullable().unique()
      /** Rubrique of the sheet (« Monde », « Local », « Sport »…). */
      table.string('section', 40).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_fetched_at').nullable()
      table.text('last_error').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('news_items', (table) => {
      table.increments('id').notNullable()
      table
        .integer('source_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('news_sources')
        .onDelete('CASCADE')
      table.string('guid', 500).notNullable()
      table.string('title', 300).notNullable()
      /** The publisher's own summary (chapô), plain text, never rewritten. */
      table.text('summary').nullable()
      table.string('link', 1000).nullable()
      table.timestamp('published_at').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['source_id', 'guid'])
      table.index(['published_at'])
    })

    this.schema.createTable('news_picks', (table) => {
      table.increments('id').notNullable()
      table.date('day').notNullable()
      table
        .integer('item_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('news_items')
        .onDelete('CASCADE')
      table.integer('position').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['day', 'item_id'])
    })

    this.schema.createTable('newspaper_settings', (table) => {
      table.increments('id').notNullable()
      table.string('title', 80).notNullable().defaultTo('Le journal du foyer')
      table.string('city', 80).nullable()
      table.decimal('latitude', 8, 5).nullable()
      table.decimal('longitude', 8, 5).nullable()
      /** Articles pre-checked per rubrique when the day has no picks yet. */
      table.integer('per_section').notNullable().defaultTo(3)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('newspaper_settings')
    this.schema.dropTable('news_picks')
    this.schema.dropTable('news_items')
    this.schema.dropTable('news_sources')
  }
}
