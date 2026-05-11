/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose File adapter for the log module.
 * @sidecar file-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx log
 * @public false
 * @edit careful
 */

/**
 * File-based log adapter (server-side).
 * Writes structured JSON log lines using an injected write function.
 *
 * The write function is injected via options — no hard dependency on Node.js
 * `fs` module. Any function with signature `(line: string) => void` works,
 * including `fs.appendFileSync` bound to a path, a writable stream's write
 * method, or a custom sink.
 *
 * @typedef {object} FileLogAdapterOptions
 * @property {import('../ports/log-port.mjs').LogLevel} [minLevel]
 * @property {(line: string) => void} writeFn — receives one JSON line per log entry
 * @property {string} [scope]
 */

import { shouldLog } from '../domain/log-levels.mjs';

/**
 * Create a file-based LogPort adapter.
 *
 * @param {FileLogAdapterOptions} options
 * @returns {import('../ports/log-port.mjs').LogPort}
 */
export function createFileLogAdapter(options) {
  const { minLevel = 'debug', writeFn, scope = '' } = options;

  /**
   * @param {import('../ports/log-port.mjs').LogLevel} level
   * @param {string} message
   * @param {*} [data]
   */
  function log(level, message, data) {
    if (!shouldLog(level, minLevel)) return;

    /** @type {import('../ports/log-port.mjs').LogEntry} */
    const entry = {
      level,
      message,
      timestamp: Date.now(),
    };

    if (scope) entry.scope = scope;
    if (data !== undefined) entry.data = data;

    writeFn(JSON.stringify(entry));
  }

  return {
    debug(msg, data) {
      log('debug', msg, data);
    },
    info(msg, data) {
      log('info', msg, data);
    },
    warn(msg, data) {
      log('warn', msg, data);
    },
    error(msg, data) {
      log('error', msg, data);
    },
    child(childScope) {
      const newScope = scope ? `${scope}:${childScope}` : childScope;
      return createFileLogAdapter({ minLevel, writeFn, scope: newScope });
    },
  };
}
