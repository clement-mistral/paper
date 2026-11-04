import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * pg returns `numeric` values as strings: expose them as numbers
 * (quantities, liters). Amounts never use `numeric`, they are cents.
 */
const decimal = {
  tsType: 'number',
  decorator:
    '@column({ consume: (value: string | number | null) => value === null ? null : Number(value) })',
}

export default {
  types: {
    numeric: decimal,
    decimal: decimal,
  },
} satisfies SchemaRules
