/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Seam port contract for the feature-seams module.
 * @sidecar seam-port.mjs.header.md
 * @layer module | @hex port | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Port contract for feature seam adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-037
 *
 * @typedef {Object} SeamPort
 * @property {(flag: string) => boolean} isEnabled
 * @property {(flag: string) => boolean} isShadow
 * @property {(flag: string, config: import('../domain/seam-registry.mjs').SeamConfig) => void} register
 * @property {(flag: string) => void} enable
 * @property {(flag: string) => void} disable
 * @property {() => import('../domain/seam-registry.mjs').SeamEntry[]} list
 * @property {(flag: string) => void} remove
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = [
  'isEnabled',
  'isShadow',
  'register',
  'enable',
  'disable',
  'list',
  'remove',
];

/**
 * Validate that an adapter conforms to the SeamPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertSeamPort(adapter) {
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
