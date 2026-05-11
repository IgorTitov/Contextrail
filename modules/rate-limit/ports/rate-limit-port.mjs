/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for rate-limit adapters.
 * @sidecar rate-limit-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx rate-limit
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for rate-limit adapters.
 *
 * @typedef {object} RateLimitDecision
 * @property {boolean} allowed        Whether the request is permitted.
 * @property {number} remaining       Tokens left after the decision (floor).
 * @property {number} retryAfterMs    0 if allowed, else ms until enough tokens refill.
 * @property {number} resetAt         Timestamp (ms) when the bucket will be full again.
 *
 * @typedef {object} RateLimiterPort
 * @property {(key: string, cost?: number) => RateLimitDecision} check  Consume tokens for `key` and return a decision.
 * @property {(key: string) => void} reset                              Drop the bucket for `key` (next check sees a fresh bucket).
 * @property {() => number} size                                         Count of live buckets — useful for adapters that evict.
 */

const REQUIRED = [
  ['check', 'rate-limit.port.missing_check'],
  ['reset', 'rate-limit.port.missing_reset'],
  ['size', 'rate-limit.port.missing_size'],
];

/**
 * Validate that an adapter conforms to the RateLimiterPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertRateLimiterPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('rate-limit.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
