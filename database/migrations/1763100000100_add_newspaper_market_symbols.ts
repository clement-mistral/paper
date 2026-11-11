import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Values of the « Marchés » page: Yahoo Finance symbols, comma-separated
 * (« MC.PA,AAPL,BTC-EUR »). Null, the default list; empty, no page.
 */
export default class extends BaseSchema {
  protected tableName = 'newspaper_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('market_symbols', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('market_symbols')
    })
  }
}
