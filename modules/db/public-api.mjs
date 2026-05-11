/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public API surface for the db hex module — query builder, database port, and adapters.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx db
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the db bounded module.
 * The only file other modules may import.
 */

// Domain
export { createQueryBuilder } from './domain/query-builder.mjs';

// Ports
export { assertDatabasePort } from './ports/database-port.mjs';

// Adapters
export { createMemoryDatabaseAdapter } from './adapters/memory-adapter.mjs';
export { createSqlDriverAdapter } from './adapters/sql-driver-adapter.mjs';
export { createNodeSqliteAdapter } from './adapters/node-sqlite-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
