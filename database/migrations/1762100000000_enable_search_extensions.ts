import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `pg_trgm` powers fuzzy entity matching in the universal capture,
 * `unaccent` lets names with accents match normalized input.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS unaccent')
  }

  async down() {
    this.schema.raw('DROP EXTENSION IF EXISTS unaccent')
    this.schema.raw('DROP EXTENSION IF EXISTS pg_trgm')
  }
}
