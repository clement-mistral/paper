import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Auto domain: maintenances of a vehicle. A row is either done (`done_on`)
 * or planned (`due_on` and/or `due_odometer_km`). Intervals schedule the
 * next one when it is done.
 */
export default class extends BaseSchema {
  protected tableName = 'maintenances'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table
        .enum('kind', [
          'oil_change',
          'service',
          'tires',
          'brakes',
          'timing_belt',
          'inspection',
          'battery',
          'repair',
          'other',
        ])
        .notNullable()
      table.string('label', 120).nullable()

      table.date('done_on').nullable()
      table.integer('odometer_km').nullable()
      table.integer('cost_cents').nullable()
      table.string('garage', 120).nullable()

      table.date('due_on').nullable()
      table.integer('due_odometer_km').nullable()
      table.integer('interval_km').nullable()
      table.integer('interval_months').nullable()

      table
        .integer('envelope_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('envelopes')
        .onDelete('SET NULL')
      table
        .integer('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['vehicle_id', 'done_on'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
