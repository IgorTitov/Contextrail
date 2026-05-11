/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Console adapter for the log module.
 * @sidecar console-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx log
 * @public false
 * @edit careful
 */

/**
 * Console log adapter.
 * Maps log calls to native console.debug/info/warn/error with scope prefix
 * and structured data pretty-printing.
 *
 * SpecRefs: TPL-138
 */

import { shouldLog } from '../domain/log-levels.mjs';

/**
 * @param {import('../ports/log-port.mjs').LogPortOptions & { scope?: string }} [options]
 * @returns {import('../ports/log-port.mjs').LogPort}
 */
export function createConsoleAdapter(options = {}) {
  const { minLevel = 'debug', scope = '' } = options;

  /** @param {string} prefix */
  function formatPrefix(prefix) {
    return prefix ? `[${prefix}]` : '';
  }

  /**
   * @param {import('../ports/log-port.mjs').LogLevel} level
   * @param {string} msg
   * @param {*} [data]
   */
  function log(level, msg, data) {
    if (!shouldLog(level, minLevel)) return;
    const prefix = formatPrefix(scope);
    const parts = prefix ? [prefix, msg] : [msg];
    if (data !== undefined) {
      console[level](...parts, data);
    } else {
      console[level](...parts);
    }
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
      return createConsoleAdapter({ minLevel, scope: newScope });
    },
  };
}
