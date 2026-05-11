/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the log bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx log
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the log bounded module.
 * The only file other modules may import.
 */

// Domain
export { LOG_LEVEL_PRIORITY, shouldLog } from './domain/log-levels.mjs';

// Ports
export { assertLogPort } from './ports/log-port.mjs';

// Adapters
export { createConsoleAdapter } from './adapters/console-adapter.mjs';
export { createStructuredJsonAdapter } from './adapters/structured-json-adapter.mjs';
export { createNoOpAdapter } from './adapters/no-op-adapter.mjs';
export { createRemoteAdapter } from './adapters/remote-adapter.mjs';
export { createFileLogAdapter } from './adapters/file-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
