import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Maison domain, « Logement » fiche: homes, their equipment (with periodic
 * maintenances), electrical panel and utility meters.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('homes', (table) => {
      table.increments('id').notNullable()
      table.string('name', 80).notNullable()
      table.enum('kind', ['house', 'apartment', 'other']).notNullable().defaultTo('house')
      table.enum('occupancy', ['owner', 'tenant']).notNullable().defaultTo('owner')
      table.text('address').nullable()
      table.decimal('surface_m2', 7, 2).nullable()
      table.integer('built_year').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('equipment', (table) => {
      table.increments('id').notNullable()
      table
        .integer('home_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('homes')
        .onDelete('CASCADE')
      table.string('name', 80).notNullable()
      table
        .enum('category', [
          'heating',
          'water_heater',
          'ventilation',
          'appliance',
          'electrical',
          'plumbing',
          'outdoor',
          'multimedia',
          'other',
        ])
        .notNullable()
        .defaultTo('other')
      table.string('brand', 80).nullable()
      table.string('model', 80).nullable()
      table.string('room', 80).nullable()
      table.date('purchased_on').nullable()
      table.integer('price_cents').nullable()
      table.date('warranty_until').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['home_id'])
    })

    this.schema.createTable('equipment_maintenances', (table) => {
      table.increments('id').notNullable()
      table
        .integer('equipment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('equipment')
        .onDelete('CASCADE')
      table.string('label', 120).notNullable()
      table.date('done_on').nullable()
      table.integer('cost_cents').nullable()
      table.string('provider', 120).nullable()
      table.date('due_on').nullable()
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

      table.index(['equipment_id', 'done_on'])
    })

    this.schema.createTable('electrical_circuits', (table) => {
      table.increments('id').notNullable()
      table
        .integer('home_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('homes')
        .onDelete('CASCADE')
      table.string('reference', 12).notNullable()
      table.string('label', 80).notNullable()
      table.integer('breaker_amps').nullable()
      table.string('differential', 40).nullable()
      table.decimal('section_mm2', 4, 1).nullable()
      table.string('rooms', 200).nullable()
      table.integer('power_watts').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['home_id'])
    })

    this.schema.createTable('meters', (table) => {
      table.increments('id').notNullable()
      table
        .integer('home_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('homes')
        .onDelete('CASCADE')
      table.enum('kind', ['electricity', 'water', 'gas']).notNullable()
      table.string('label', 80).notNullable()
      table.string('number', 40).nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['home_id'])
    })

    this.schema.createTable('meter_readings', (table) => {
      table.increments('id').notNullable()
      table
        .integer('meter_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('meters')
        .onDelete('CASCADE')
      table.date('read_on').notNullable()
      table.decimal('value', 12, 3).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['meter_id', 'read_on'])
    })
  }

  async down() {
    this.schema.dropTable('meter_readings')
    this.schema.dropTable('meters')
    this.schema.dropTable('electrical_circuits')
    this.schema.dropTable('equipment_maintenances')
    this.schema.dropTable('equipment')
    this.schema.dropTable('homes')
  }
}
