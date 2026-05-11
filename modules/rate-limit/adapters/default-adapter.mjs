/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory token-bucket rate-limit adapter.
 * @sidecar default-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx rate-limit
 * @public false
 * @edit careful
 */

import { createBucketState, consume, validateBucketConfig } from '../domain/rate-limit.mjs';

/**
 * In-memory rate limiter backed by the pure token-bucket domain.
 *
 * Buckets are lazily created per key and held in a Map. Callers may pass a
 * custom `now()` clock for deterministic tests. Framework-free; the host app
 * decides how to map request → key (ip, user id, route, …).
 *
 * @param {object} options
 * @param {number} options.capacity         Maximum tokens per bucket.
 * @param {number} options.refillPerSecond  Tokens refilled per second per bucket.
 * @param {() => number} [options.now]      Clock function (defaults to Date.now).
 * @returns {import('../ports/rate-limit-port.mjs').RateLimiterPort}
 */
export function createMemoryRateLimiter(options) {
  validateBucketConfig(options);
  const config = { capacity: options.capacity, refillPerSecond: options.refillPerSecond };
  const clock = options.now ?? Date.now;

  /** @type {Map<string, import('../domain/rate-limit.mjs').BucketState>} */
  const buckets = new Map();

  return {
    check(key, cost = 1) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new TypeError('rate-limit key must be a non-empty string');
      }
      const now = clock();
      let state = buckets.get(key);
      if (!state) {
        state = createBucketState(config, now);
        buckets.set(key, state);
      }
      return consume(state, config, now, cost);
    },

    reset(key) {
      buckets.delete(key);
    },

    size() {
      return buckets.size;
    },
  };
}
