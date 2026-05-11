/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Concrete real-database adapter using the built-in node:sqlite module (zero npm deps).
 * @sidecar node-sqlite-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx db
 * @public false
 * @edit careful
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Lazy, version-tolerant loader for node:sqlite.
 *
 * node:sqlite is a built-in module in Node ≥22.5 (still flagged
 * "experimental" in 22.x). The template's global engine floor is
 * Node ≥18.18, so this adapter must NOT pull node:sqlite at module
 * load time — that would break import of public-api.mjs on Node 18.
 *
 * Instead the import happens the first time the factory is called,
 * with the experimental warning suppressed for that single load
 * (the warning is informational and would otherwise spam every test
 * run that touches this adapter).
 */
let cachedSqlite;
function loadNodeSqlite() {
  if (cachedSqlite !== undefined) {
    if (cachedSqlite === null) {
      throw new Error(
        'node:sqlite is not available — this adapter requires Node ≥22.5. ' +
          'Use createMemoryDatabaseAdapter for testing, or createSqlDriverAdapter ' +
          'with an injected driver (better-sqlite3, pg, mysql2, …) on older Node.',
      );
    }
    return cachedSqlite;
  }

  const originalEmit = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    const text = typeof warning === 'string' ? warning : warning && warning.message;
    if (typeof text === 'string' && text.includes('SQLite is an experimental feature')) return;
    return originalEmit.call(process, warning, ...rest);
  };
  try {
    cachedSqlite = require('node:sqlite');
  } catch {
    cachedSqlite = null;
  } finally {
    process.emitWarning = originalEmit;
  }

  return loadNodeSqlite();
}

/**
 * @typedef {object} NodeSqliteAdapterOptions
 * @property {string} [location] — Filesystem path to the SQLite file. Defaults to `:memory:`.
 * @property {boolean} [readOnly] — Open the database in read-only mode.
 */

/**
 * Create a DatabasePort adapter backed by Node's built-in `node:sqlite` module.
 *
 * @param {NodeSqliteAdapterOptions} [options]
 * @returns {import('../ports/database-port.mjs').DatabasePort}
 */
export function createNodeSqliteAdapter(options = {}) {
  const { DatabaseSync } = loadNodeSqlite();
  const db = new DatabaseSync(options.location ?? ':memory:', {
    readOnly: options.readOnly === true,
  });

  /**
   * @param {string} sql
   * @param {unknown[]} params
   * @returns {import('../ports/database-port.mjs').QueryResult}
   */
  function runQuery(sql, params) {
    const stmt = db.prepare(sql);
    // node:sqlite returns null-prototype objects; rehydrate to plain objects
    // so consumers see the same shape as the memory adapter (Record<string, unknown>).
    const rows = stmt.all(...params).map((row) => ({ ...row }));
    return { rows, rowCount: rows.length };
  }

  /**
   * @param {string} sql
   * @param {unknown[]} params
   * @returns {import('../ports/database-port.mjs').QueryResult}
   */
  function runExecute(sql, params) {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    const changes = Number(result.changes ?? 0);
    return { rows: [], rowCount: changes };
  }

  return {
    query(sql, params = []) {
      return runQuery(sql, params);
    },

    execute(sql, params = []) {
      return runExecute(sql, params);
    },

    transaction(fn) {
      db.exec('BEGIN');
      try {
        fn({
          query: (sql, params = []) => runQuery(sql, params),
          execute: (sql, params = []) => runExecute(sql, params),
        });
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    close() {
      db.close();
    },
  };
}
