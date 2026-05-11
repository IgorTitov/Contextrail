/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sql Driver adapter for the db module.
 * @sidecar sql-driver-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx db
 * @public false
 * @edit careful
 */

/**
 * SQL driver adapter (server-side).
 * Implements DatabasePort by delegating to an injected SQL driver.
 *
 * The driver is injected via options — no hard dependency on any SQL library.
 * Any driver implementing the minimal contract works:
 *   { query(sql, params) => { rows, rowCount }, close() }
 *
 * Compatible with pg, mysql2, better-sqlite3, or any similar library
 * when wrapped with a thin adapter.
 *
 * @typedef {object} SqlDriver
 * @property {(sql: string, params?: unknown[]) => import('../ports/database-port.mjs').QueryResult} query
 * @property {() => void} close
 *
 * @typedef {object} SqlDriverAdapterOptions
 * @property {SqlDriver} driver
 */

/**
 * Create a SQL-driver-backed DatabasePort adapter.
 *
 * @param {SqlDriverAdapterOptions} options
 * @returns {import('../ports/database-port.mjs').DatabasePort}
 */
export function createSqlDriverAdapter(options) {
  const { driver } = options;

  return {
    query(sql, params = []) {
      return driver.query(sql, params);
    },

    execute(sql, params = []) {
      return driver.query(sql, params);
    },

    transaction(fn) {
      driver.query('BEGIN');
      try {
        fn({
          query: (sql, params) => driver.query(sql, params),
          execute: (sql, params) => driver.query(sql, params),
        });
        driver.query('COMMIT');
      } catch (err) {
        driver.query('ROLLBACK');
        throw err;
      }
    },

    close() {
      driver.close();
    },
  };
}
