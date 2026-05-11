/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Log Levels domain logic for the log module.
 * @sidecar log-levels.mjs.header.md
 * @layer module | @hex domain | @ctx log
 * @public false
 * @edit careful
 */

/**
 * Numeric priority map for log levels.
 * debug=0, info=1, warn=2, error=3.
 *
 * @type {Record<import('../ports/log-port.mjs').LogLevel, number>}
 */
export const LOG_LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Returns true if the given level meets or exceeds the minimum level.
 *
 * @param {import('../ports/log-port.mjs').LogLevel} level
 * @param {import('../ports/log-port.mjs').LogLevel} minLevel
 * @returns {boolean}
 */
export function shouldLog(level, minLevel) {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}
