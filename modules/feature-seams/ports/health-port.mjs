/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Health check port contract for seam state aggregation.
 * @sidecar health-port.mjs.header.md
 * @layer module | @hex port | @ctx feature-seams
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * @typedef {Object} SeamHealth
 * @property {string} flag
 * @property {string} state
 * @property {string} [enabledAt]
 * @property {string} [disabledAt]
 * @property {string} [cleanupBy]
 */

/**
 * @typedef {Object} HealthResult
 * @property {boolean} healthy - false if any seam was auto-disabled or has overdue cleanup
 * @property {SeamHealth[]} seams
 */

/**
 * @typedef {Object} HealthPort
 * @property {() => HealthResult} check
 */

const REQUIRED_METHODS = ['check'];

/**
 * Validate that an adapter conforms to the HealthPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError}
 */
export function assertHealthPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('feature-seams.port.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('feature-seams.port.missing_method', { method }));
    }
  }
}
