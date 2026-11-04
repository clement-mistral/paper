import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Auto domain: vehicles and fuel logs.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('vehicles', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table.string('plate', 20).nullable()
      table.enum('fuel', ['sp95', 'sp98', 'e10', 'e85', 'diesel', 'lpg', 'electric']).notNullable()
      table.integer('initial_odometer_km').notNullable().defaultTo(0)
      table.integer('estimated_value_cents').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('fuel_logs', (table) => {
      table.increments('id').notNullable()
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table.decimal('liters', 7, 2).notNullable()
      table.integer('total_cents').notNullable()
      table.integer('odometer_km').nullable()
      table.date('filled_on').notNullable()
      table.text('capture_text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['vehicle_id', 'filled_on'])
    })
  }

  async down() {
    this.schema.dropTable('fuel_logs')
    this.schema.dropTable('vehicles')
  }
}
