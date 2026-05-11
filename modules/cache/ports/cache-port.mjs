/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Cache port contract for the cache module.
 * @sidecar cache-port.mjs.header.md
 * @layer module | @hex port | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * Port contract for cache adapters.
 *
 * @typedef {object} CacheEntry
 * @property {*} value
 * @property {number} createdAt
 * @property {number} accessedAt
 * @property {number} [ttl] — time-to-live in milliseconds
 * @property {number} [size] — logical size hint
 */

/**
 * @typedef {object} CacheSetOptions
 * @property {number} [ttl] — time-to-live in milliseconds
 * @property {number} [size] — logical size hint
 */

/**
 * @typedef {object} CachePortOptions
 * @property {number} [maxEntries] — maximum number of entries before LRU eviction
 * @property {number} [maxSize] — maximum cumulative size
 * @property {number} [defaultTtl] — default TTL in milliseconds
 */

/**
 * @typedef {object} CachePort
 * @property {(key: string) => *|undefined} get — retrieve value or undefined if missing/expired
 * @property {(key: string, value: *, options?: CacheSetOptions) => void} set
 * @property {(key: string) => boolean} delete
 * @property {(key: string) => boolean} has
 * @property {() => void} clear
 * @property {() => number} size — count of non-expired entries
 * @property {() => string[]} keys — keys of non-expired entries
 */

import { t } from '../messages.mjs';

/**
 * Validate that an adapter conforms to the CachePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertCachePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('cache.port.not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);

  const methods = [
    ['get', 'cache.port.missing_get'],
    ['set', 'cache.port.missing_set'],
    ['delete', 'cache.port.missing_delete'],
    ['has', 'cache.port.missing_has'],
    ['clear', 'cache.port.missing_clear'],
    ['size', 'cache.port.missing_size'],
    ['keys', 'cache.port.missing_keys'],
  ];

  for (const [method, msgKey] of methods) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(msgKey));
    }
  }
}
