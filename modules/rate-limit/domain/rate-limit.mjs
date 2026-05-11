/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure token-bucket domain for the rate-limit module.
 * @sidecar rate-limit.mjs.header.md
 * @layer domain | @hex _none_ | @ctx rate-limit
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure token-bucket domain.
 *
 * Classic algorithm: each key owns a bucket of up to `capacity` tokens, which
 * refills continuously at `refillPerSecond`. A request consumes `cost` tokens
 * when the bucket has enough; otherwise it is rejected with a `retryAfterMs`
 * telling the caller when enough tokens will have refilled.
 *
 * The domain is pure — all time comes from the caller, all state lives in the
 * `state` argument that the adapter owns and mutates. This keeps the algorithm
 * trivially testable and lets different adapters (memory, redis, …) share it.
 *
 * @typedef {object} BucketState
 * @property {number} tokens     Current token count (fractional).
 * @property {number} updatedAt  Timestamp of last refill calculation (ms).
 *
 * @typedef {object} BucketConfig
 * @property {number} capacity         Maximum tokens the bucket can hold.
 * @property {number} refillPerSecond  Tokens refilled per second (may be fractional).
 *
 * @typedef {object} ConsumeDecision
 * @property {boolean} allowed          Whether the request is permitted.
 * @property {number} remaining         Whole tokens remaining after the decision.
 * @property {number} retryAfterMs      0 if allowed, else ms until enough tokens refill.
 * @property {number} resetAt           Timestamp (ms) when the bucket is fully refilled.
 */

/**
 * Validate a bucket configuration.
 *
 * @param {BucketConfig} config
 */
export function validateBucketConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError(t('rate-limit.config.not_object'));
  }
  if (typeof config.capacity !== 'number' || config.capacity <= 0) {
    throw new TypeError(t('rate-limit.config.invalid_capacity'));
  }
  if (typeof config.refillPerSecond !== 'number' || config.refillPerSecond <= 0) {
    throw new TypeError(t('rate-limit.config.invalid_refill'));
  }
}

/**
 * Create a fresh bucket state at full capacity.
 *
 * @param {BucketConfig} config
 * @param {number} now
 * @returns {BucketState}
 */
export function createBucketState(config, now) {
  validateBucketConfig(config);
  return { tokens: config.capacity, updatedAt: now };
}

/**
 * Refill a bucket in-place based on elapsed time, capped at capacity.
 *
 * @param {BucketState} state
 * @param {BucketConfig} config
 * @param {number} now
 */
export function refill(state, config, now) {
  const elapsedMs = Math.max(0, now - state.updatedAt);
  const refill = (elapsedMs / 1000) * config.refillPerSecond;
  state.tokens = Math.min(config.capacity, state.tokens + refill);
  state.updatedAt = now;
}

/**
 * Attempt to consume `cost` tokens from the bucket.
 * Mutates `state` only if the request is allowed.
 *
 * @param {BucketState} state
 * @param {BucketConfig} config
 * @param {number} now
 * @param {number} [cost=1]
 * @returns {ConsumeDecision}
 */
export function consume(state, config, now, cost = 1) {
  validateBucketConfig(config);
  if (typeof cost !== 'number' || cost <= 0) {
    throw new TypeError(t('rate-limit.consume.invalid_cost'));
  }
  refill(state, config, now);

  if (state.tokens >= cost) {
    state.tokens -= cost;
    return {
      allowed: true,
      remaining: Math.floor(state.tokens),
      retryAfterMs: 0,
      resetAt: now + ((config.capacity - state.tokens) / config.refillPerSecond) * 1000,
    };
  }

  const missing = cost - state.tokens;
  const retryAfterMs = Math.ceil((missing / config.refillPerSecond) * 1000);
  return {
    allowed: false,
    remaining: Math.floor(state.tokens),
    retryAfterMs,
    resetAt: now + retryAfterMs,
  };
}
