/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure value-object factories for service-worker cache strategies.
 * @sidecar cache-strategy.mjs.header.md
 * @layer domain | @hex _none_ | @ctx pwa
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure cache strategy descriptors used by the service worker source
 * generator. These are plain value objects — they do not perform any
 * caching themselves, they describe the rule the generated worker will
 * enforce at runtime.
 *
 * @typedef {'cacheFirst'|'networkFirst'|'staleWhileRevalidate'|'networkOnly'|'cacheOnly'} CacheStrategyType
 *
 * @typedef {object} CacheStrategy
 * @property {CacheStrategyType} type
 * @property {string} cacheName
 * @property {number} [maxEntries]
 * @property {number} [maxAgeSeconds]
 */

const STRATEGY_TYPES = new Set([
  'cacheFirst',
  'networkFirst',
  'staleWhileRevalidate',
  'networkOnly',
  'cacheOnly',
]);

/**
 * Validate and construct a frozen {@link CacheStrategy}.
 *
 * @param {{
 *   type: CacheStrategyType,
 *   cacheName: string,
 *   maxEntries?: number,
 *   maxAgeSeconds?: number
 * }} input
 * @returns {Readonly<CacheStrategy>}
 */
export function createCacheStrategy(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('pwa.cache.invalid_type'));
  }
  const { type, cacheName, maxEntries, maxAgeSeconds } = input;
  if (typeof type !== 'string' || !STRATEGY_TYPES.has(type)) {
    throw new TypeError(t('pwa.cache.invalid_type'));
  }
  if (typeof cacheName !== 'string' || cacheName.length === 0) {
    throw new TypeError(t('pwa.cache.invalid_cache_name'));
  }
  if (maxEntries != null) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new TypeError(t('pwa.cache.invalid_max_entries'));
    }
  }
  if (maxAgeSeconds != null) {
    if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
      throw new TypeError(t('pwa.cache.invalid_max_age'));
    }
  }

  /** @type {CacheStrategy} */
  const descriptor = { type, cacheName };
  if (maxEntries != null) descriptor.maxEntries = maxEntries;
  if (maxAgeSeconds != null) descriptor.maxAgeSeconds = maxAgeSeconds;
  return Object.freeze(descriptor);
}

/** @param {string} cacheName @param {Partial<CacheStrategy>} [options] */
export function cacheFirst(cacheName, options = {}) {
  return createCacheStrategy({ type: 'cacheFirst', cacheName, ...options });
}

/** @param {string} cacheName @param {Partial<CacheStrategy>} [options] */
export function networkFirst(cacheName, options = {}) {
  return createCacheStrategy({ type: 'networkFirst', cacheName, ...options });
}

/** @param {string} cacheName @param {Partial<CacheStrategy>} [options] */
export function staleWhileRevalidate(cacheName, options = {}) {
  return createCacheStrategy({ type: 'staleWhileRevalidate', cacheName, ...options });
}

/** @param {string} cacheName @param {Partial<CacheStrategy>} [options] */
export function networkOnly(cacheName, options = {}) {
  return createCacheStrategy({ type: 'networkOnly', cacheName, ...options });
}

/** @param {string} cacheName @param {Partial<CacheStrategy>} [options] */
export function cacheOnly(cacheName, options = {}) {
  return createCacheStrategy({ type: 'cacheOnly', cacheName, ...options });
}
