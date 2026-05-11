/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Database port contract for the db module.
 * @sidecar database-port.mjs.header.md
 * @layer module | @hex port | @ctx db
 * @public false
 * @edit careful
 */

/**
 * Port contract for database adapters.
 *
 * @typedef {object} QueryResult
 * @property {Array<Record<string, unknown>>} rows — result rows
 * @property {number} rowCount — number of rows returned or affected
 *
 * @typedef {object} DatabasePort
 * @property {(sql: string, params?: unknown[]) => QueryResult} query — execute a read query
 * @property {(sql: string, params?: unknown[]) => QueryResult} execute — execute a write statement
 * @property {(fn: (tx: { query: Function, execute: Function }) => void) => void} transaction — run operations in a transaction
 * @property {() => void} close — close the connection
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['query', 'execute', 'transaction', 'close'];

/**
 * Validate that an adapter conforms to the DatabasePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertDatabasePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('db.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('db.port.missing_method', { method }));
    }
  }
}
