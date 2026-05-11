/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the rate-limit bounded module — token-bucket math, adapter behavior, and port validation.
 * @sidecar rate-limit.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBucketState,
  consume,
  refill,
  validateBucketConfig,
  assertRateLimiterPort,
  createMemoryRateLimiter,
} from '../../modules/rate-limit/public-api.mjs';

describe('rate-limit domain — token bucket', () => {
  test('createBucketState initializes a full bucket at the given time', () => {
    const state = createBucketState({ capacity: 10, refillPerSecond: 5 }, 1000);
    assert.equal(state.tokens, 10);
    assert.equal(state.updatedAt, 1000);
  });

  test('consume allows requests while tokens are available', () => {
    const config = { capacity: 3, refillPerSecond: 1 };
    const state = createBucketState(config, 0);
    const d1 = consume(state, config, 0);
    const d2 = consume(state, config, 0);
    const d3 = consume(state, config, 0);
    assert.equal(d1.allowed, true);
    assert.equal(d2.allowed, true);
    assert.equal(d3.allowed, true);
    assert.equal(d3.remaining, 0);
  });

  test('consume rejects when the bucket is empty', () => {
    const config = { capacity: 1, refillPerSecond: 1 };
    const state = createBucketState(config, 0);
    consume(state, config, 0);
    const rejected = consume(state, config, 0);
    assert.equal(rejected.allowed, false);
    assert.equal(rejected.remaining, 0);
    assert.ok(rejected.retryAfterMs > 0);
  });

  test('retryAfterMs reflects the time until enough tokens refill', () => {
    const config = { capacity: 1, refillPerSecond: 2 }; // 2 tokens/sec → 500 ms per token
    const state = createBucketState(config, 0);
    consume(state, config, 0); // drain
    const rejected = consume(state, config, 0);
    assert.equal(rejected.retryAfterMs, 500);
    assert.equal(rejected.resetAt, 500);
  });

  test('refill regenerates tokens proportionally to elapsed time, capped at capacity', () => {
    const config = { capacity: 10, refillPerSecond: 5 };
    const state = { tokens: 0, updatedAt: 0 };
    refill(state, config, 1000); // 1 sec → +5 tokens
    assert.equal(state.tokens, 5);
    refill(state, config, 10_000); // long gap → cap at 10
    assert.equal(state.tokens, 10);
  });

  test('consume with cost > 1 consumes multiple tokens atomically', () => {
    const config = { capacity: 5, refillPerSecond: 1 };
    const state = createBucketState(config, 0);
    const d = consume(state, config, 0, 3);
    assert.equal(d.allowed, true);
    assert.equal(d.remaining, 2);
  });

  test('consume with cost greater than available tokens is rejected without spending partial tokens', () => {
    const config = { capacity: 5, refillPerSecond: 1 };
    const state = createBucketState(config, 0);
    consume(state, config, 0, 3); // leaves 2
    const d = consume(state, config, 0, 3); // needs 3, has 2 → reject
    assert.equal(d.allowed, false);
    assert.equal(d.remaining, 2);
  });

  test('validateBucketConfig rejects invalid configs', () => {
    assert.throws(() => validateBucketConfig(null), TypeError);
    assert.throws(() => validateBucketConfig({ capacity: 0, refillPerSecond: 1 }), TypeError);
    assert.throws(() => validateBucketConfig({ capacity: 1, refillPerSecond: 0 }), TypeError);
    assert.throws(() => validateBucketConfig({ capacity: -1, refillPerSecond: 1 }), TypeError);
  });

  test('consume rejects non-positive cost', () => {
    const config = { capacity: 5, refillPerSecond: 1 };
    const state = createBucketState(config, 0);
    assert.throws(() => consume(state, config, 0, 0), TypeError);
    assert.throws(() => consume(state, config, 0, -1), TypeError);
  });
});

describe('rate-limit port — assertRateLimiterPort()', () => {
  test('accepts an adapter with check, reset, and size', () => {
    assert.doesNotThrow(() =>
      assertRateLimiterPort({ check: () => ({}), reset: () => {}, size: () => 0 }),
    );
  });

  test('throws for null or non-object', () => {
    assert.throws(() => assertRateLimiterPort(null), TypeError);
    assert.throws(() => assertRateLimiterPort('nope'), TypeError);
  });

  test('throws when a required method is missing', () => {
    assert.throws(() => assertRateLimiterPort({ check: () => ({}), reset: () => {} }), TypeError);
    assert.throws(() => assertRateLimiterPort({ reset: () => {}, size: () => 0 }), TypeError);
  });
});

describe('rate-limit adapter — createMemoryRateLimiter()', () => {
  test('satisfies the port contract', () => {
    const limiter = createMemoryRateLimiter({ capacity: 1, refillPerSecond: 1 });
    assert.doesNotThrow(() => assertRateLimiterPort(limiter));
  });

  test('isolates buckets by key', () => {
    const limiter = createMemoryRateLimiter({ capacity: 1, refillPerSecond: 1 });
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('b').allowed, true); // separate bucket
    assert.equal(limiter.check('a').allowed, false);
    assert.equal(limiter.check('b').allowed, false);
  });

  test('regenerates tokens over time when using a custom clock', () => {
    let now = 0;
    const limiter = createMemoryRateLimiter({
      capacity: 2,
      refillPerSecond: 1,
      now: () => now,
    });
    assert.equal(limiter.check('k').allowed, true); // 1 left
    assert.equal(limiter.check('k').allowed, true); // 0 left
    assert.equal(limiter.check('k').allowed, false);
    now += 1000; // refill +1 token
    assert.equal(limiter.check('k').allowed, true);
    assert.equal(limiter.check('k').allowed, false);
  });

  test('reset drops a bucket so the next check sees a fresh one', () => {
    const limiter = createMemoryRateLimiter({ capacity: 1, refillPerSecond: 1 });
    limiter.check('k'); // drain
    assert.equal(limiter.check('k').allowed, false);
    limiter.reset('k');
    assert.equal(limiter.check('k').allowed, true);
  });

  test('size reports the number of live buckets', () => {
    const limiter = createMemoryRateLimiter({ capacity: 1, refillPerSecond: 1 });
    assert.equal(limiter.size(), 0);
    limiter.check('a');
    limiter.check('b');
    assert.equal(limiter.size(), 2);
    limiter.reset('a');
    assert.equal(limiter.size(), 1);
  });

  test('rejects non-string or empty keys', () => {
    const limiter = createMemoryRateLimiter({ capacity: 1, refillPerSecond: 1 });
    assert.throws(() => limiter.check(''), TypeError);
    assert.throws(() => limiter.check(123), TypeError);
  });

  test('throws on invalid config', () => {
    assert.throws(() => createMemoryRateLimiter({ capacity: 0, refillPerSecond: 1 }), TypeError);
    assert.throws(() => createMemoryRateLimiter({ capacity: 1, refillPerSecond: -1 }), TypeError);
  });
});
