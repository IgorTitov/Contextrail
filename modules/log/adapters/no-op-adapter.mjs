/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose No Op adapter for the log module.
 * @sidecar no-op-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx log
 * @public false
 * @edit careful
 */

/**
 * No-op log adapter.
 * All methods silently discard their arguments.
 * Useful for tests or production paths where logging should be suppressed.
 *
 * SpecRefs: TPL-140
 */

/**
 * @returns {import('../ports/log-port.mjs').LogPort}
 */
export function createNoOpAdapter() {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return createNoOpAdapter();
    },
  };
}
