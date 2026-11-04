import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `surface_m2` and `section_mm2` do not survive Lucid's snake case naming
 * (`surfaceM2` → `surface_m_2`): renamed to names that round-trip.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('homes', (table) => {
      table.renameColumn('surface_m2', 'surface_sqm')
    })
    this.schema.alterTable('electrical_circuits', (table) => {
      table.renameColumn('section_mm2', 'section_sqmm')
    })
  }

  async down() {
    this.schema.alterTable('homes', (table) => {
      table.renameColumn('surface_sqm', 'surface_m2')
    })
    this.schema.alterTable('electrical_circuits', (table) => {
      table.renameColumn('section_sqmm', 'section_mm2')
    })
  }
}
