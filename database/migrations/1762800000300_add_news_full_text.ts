import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The full text of picked articles (pages 2 and 3 of the newspaper), and
 * the version of the default sources installed, so that an updated list
 * replaces the previous defaults without touching sources added by hand.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('news_items', (table) => {
      /** Paragraphs separated by blank lines, plain text. */
      table.text('body').nullable()
      /** Marked as not free by the publisher: only the public part. */
      table.boolean('restricted').notNullable().defaultTo(false)
      table.timestamp('body_fetched_at').nullable()
    })
    this.schema.alterTable('newspaper_settings', (table) => {
      table.integer('defaults_version').notNullable().defaultTo(0)
    })
    this.defer(async (db) => {
      await db
        .from('newspaper_settings')
        .where('defaults_installed', true)
        .update({ defaults_version: 1 })
    })
  }

  async down() {
    this.schema.alterTable('newspaper_settings', (table) => {
      table.dropColumn('defaults_version')
    })
    this.schema.alterTable('news_items', (table) => {
      table.dropColumn('body_fetched_at')
      table.dropColumn('restricted')
      table.dropColumn('body')
    })
  }
}
