/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Cache Utils domain logic for the cache module.
 * @sidecar cache-utils.mjs.header.md
 * @layer module | @hex domain | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * Pure domain utilities for cache logic.
 * Framework-free, no external dependencies.
 */

/**
 * Check whether a cache entry has expired based on its TTL.
 *
 * @param {import('../ports/cache-port.mjs').CacheEntry} entry
 * @param {number} [now] — current timestamp, defaults to Date.now()
 * @returns {boolean}
 */
export function isExpired(entry, now) {
  if (entry.ttl == null || entry.ttl <= 0) return false;
  const currentTime = now ?? Date.now();
  return currentTime > entry.createdAt + entry.ttl;
}

/**
 * Create an LRU access-order tracker.
 *
 * Tracks key access recency using an array-backed ordered list.
 * The most-recently-touched key is at the end; the least-recently-touched is at the front.
 *
 * @param {number} maxEntries
 * @returns {{ touch(key: string): void, evictNext(): string|undefined, getOrder(): string[], remove(key: string): void }}
 */
export function createLruTracker(_maxEntries) {
  /** @type {string[]} */
  const order = [];

  return {
    /**
     * Mark a key as recently accessed. Moves it to the end of the order.
     * @param {string} key
     */
    touch(key) {
      const idx = order.indexOf(key);
      if (idx >= 0) {
        order.splice(idx, 1);
      }
      order.push(key);
    },

    /**
     * Remove and return the least-recently-used key (front of the order).
     * Returns undefined if the tracker is empty.
     * @returns {string|undefined}
     */
    evictNext() {
      if (order.length === 0) return undefined;
      return order.shift();
    },

    /**
     * Return a snapshot of the current access order (least-recent first).
     * @returns {string[]}
     */
    getOrder() {
      return [...order];
    },

    /**
     * Remove a specific key from the tracker entirely.
     * @param {string} key
     */
    remove(key) {
      const idx = order.indexOf(key);
      if (idx >= 0) {
        order.splice(idx, 1);
      }
    },
  };
}
