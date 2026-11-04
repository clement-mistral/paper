import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Default news sources are installed once (a removed default is never
 * re-added), and two articles per rubrique are pre-checked so that the
 * eight default rubriques fit on one A4 sheet.
 */
export default class extends BaseSchema {
  protected tableName = 'newspaper_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('defaults_installed').notNullable().defaultTo(false)
      table.integer('per_section').notNullable().defaultTo(2).alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('defaults_installed')
      table.integer('per_section').notNullable().defaultTo(3).alter()
    })
  }
}
