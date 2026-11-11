import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The tax wrapper of an account (« pea », « assurance_vie », « livret »…)
 * and the day it was opened, from which the 5 years of a PEA and the
 * 8 years of an assurance-vie are counted. Both null for a plain account.
 */
export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('wrapper', 20).nullable()
      table.date('opened_on').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('wrapper')
      table.dropColumn('opened_on')
    })
  }
}
