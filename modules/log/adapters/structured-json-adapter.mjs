/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Structured Json adapter for the log module.
 * @sidecar structured-json-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx log
 * @public false
 * @edit careful
 */

/**
 * Structured JSON log adapter.
 * Each log entry is emitted as a single JSON line via a configurable write function.
 *
 * SpecRefs: TPL-139
 */

import { shouldLog } from '../domain/log-levels.mjs';

/**
 * @typedef {object} StructuredJsonAdapterOptions
 * @property {import('../ports/log-port.mjs').LogLevel} [minLevel]
 * @property {(line: string) => void} [writeFn]
 * @property {string} [scope]
 */

/**
 * @param {StructuredJsonAdapterOptions} [options]
 * @returns {import('../ports/log-port.mjs').LogPort}
 */
export function createStructuredJsonAdapter(options = {}) {
  const { minLevel = 'debug', writeFn = console.log, scope = '' } = options;

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
      return createStructuredJsonAdapter({ minLevel, writeFn, scope: newScope });
    },
  };
}
