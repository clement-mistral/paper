import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Zone of the school holidays printed in the sheet (« A », « B », « C »,
 * « Corse »); null, they are not printed.
 */
export default class extends BaseSchema {
  protected tableName = 'newspaper_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('school_zone', 10).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('school_zone')
    })
  }
}
