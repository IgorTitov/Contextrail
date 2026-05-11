/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Storage port contract for the user-preferences module.
 * @sidecar storage-port.mjs.header.md
 * @layer module | @hex port | @ctx user-preferences
 * @public false
 * @edit careful
 */

/**
 * Port contract for preference storage adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * @typedef {object} StoragePort
 * @property {() => import('../domain/preferences.mjs').PreferencesState | null} load
 * @property {(state: import('../domain/preferences.mjs').PreferencesState) => void} save
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the StoragePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertStoragePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('user-preferences.port.invalid_adapter'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  if (typeof a.load !== 'function') {
    throw new TypeError(t('user-preferences.port.missing_load'));
  }
  if (typeof a.save !== 'function') {
    throw new TypeError(t('user-preferences.port.missing_save'));
  }
}
