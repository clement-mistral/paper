import pg from 'pg'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Keep `date` columns as `YYYY-MM-DD` strings: the default parser turns
 * them into a JS Date at midnight UTC, i.e. 01:00 in Paris, which breaks
 * day comparisons. Luxon then reads them in the household zone.
 */
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value)

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   */
  connection: 'pg',

  connections: {
    /**
     * PostgreSQL connection (requires the `pg_trgm` extension for fuzzy search).
     */
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD')?.release(),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
