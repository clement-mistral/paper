/**
 * Minimal typing of the `pg` driver for `config/database.ts`, which only
 * registers a type parser (`@types/pg` is not installed).
 */
declare module 'pg' {
  const pg: {
    types: {
      builtins: { DATE: number }
      setTypeParser(oid: number, parser: (value: string) => unknown): void
    }
  }
  export default pg
}
