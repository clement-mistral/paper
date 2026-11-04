import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'capture_aliases'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      /**
       * Normalized phrase (lowercase, no accents, single spaces).
       */
      table.string('phrase', 160).notNullable()
      table.string('entity_type', 40).notNullable()
      table.integer('entity_id').notNullable()
      /**
       * `manual` aliases come from fiche forms, `learned` ones from
       * corrections made in the capture preview.
       */
      table.enum('origin', ['manual', 'learned']).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['entity_type', 'phrase'])
      table.index(['entity_type', 'entity_id'])
    })

    this.schema.raw(
      'CREATE INDEX capture_aliases_phrase_trgm ON capture_aliases USING gin (phrase gin_trgm_ops)'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
