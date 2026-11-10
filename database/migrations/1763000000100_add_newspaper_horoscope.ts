import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Horoscope of the sheet: the household's signs, comma-separated keys
 * (« aries,leo »); empty, no horoscope is printed.
 */
export default class extends BaseSchema {
  protected tableName = 'newspaper_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('horoscope_signs', 120).notNullable().defaultTo('')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('horoscope_signs')
    })
  }
}
