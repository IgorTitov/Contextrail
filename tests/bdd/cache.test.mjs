/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of cache-test in this repository.
 * @sidecar cache.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for cache.feature.
 * Proves user-visible caching behavior through the cache module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { assertCachePort, createMemoryLruAdapter } from '../../modules/cache/public-api.mjs';

const feature = readFileSync(new URL('./features/cache.feature', import.meta.url), 'utf8');

describe('Feature: TTL/LRU caching', () => {
  /** @type {ReturnType<typeof createMemoryLruAdapter>} */
  let cache;

  beforeEach(() => {
    cache = createMemoryLruAdapter();
    assertCachePort(cache);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: TTL/LRU caching'));
    assert.ok(feature.includes('Scenario: Store and retrieve a cached value'));
    assert.ok(feature.includes('Scenario: Cache miss returns undefined'));
    assert.ok(feature.includes('Scenario: Delete a cached entry'));
    assert.ok(feature.includes('Scenario: TTL expiration removes entry'));
    assert.ok(feature.includes('Scenario: LRU eviction when max entries exceeded'));
  });

  test('Scenario: Store and retrieve a cached value', () => {
    // When the user stores key "user:1" with value "Alice"
    cache.set('user:1', 'Alice');

    // Then the cache returns "Alice" for key "user:1"
    assert.equal(cache.get('user:1'), 'Alice');
  });

  test('Scenario: Cache miss returns undefined', () => {
    // When the user requests key "nonexistent"
    // Then the cache returns undefined
    assert.equal(cache.get('nonexistent'), undefined);
  });

  test('Scenario: Delete a cached entry', () => {
    // Given the cache contains key "temp" with value "data"
    cache.set('temp', 'data');
    assert.equal(cache.has('temp'), true);

    // When the user deletes key "temp"
    cache.delete('temp');

    // Then the cache does not contain key "temp"
    assert.equal(cache.has('temp'), false);
  });

  test('Scenario: TTL expiration removes entry', async () => {
    // Given the cache adapter is active with a 50ms default TTL
    cache = createMemoryLruAdapter({ defaultTtl: 50 });

    // When the user stores key "expiring" with value "gone-soon"
    cache.set('expiring', 'gone-soon');

    // And 60ms have passed
    await delay(60);

    // Then the cache returns undefined for key "expiring"
    assert.equal(cache.get('expiring'), undefined);
  });

  test('Scenario: LRU eviction when max entries exceeded', () => {
    // Given the cache adapter is active with max 2 entries
    cache = createMemoryLruAdapter({ maxEntries: 2 });

    // When the user stores key "a" with value "1"
    cache.set('a', '1');
    // And the user stores key "b" with value "2"
    cache.set('b', '2');
    // And the user stores key "c" with value "3"
    cache.set('c', '3');

    // Then the cache does not contain key "a"
    assert.equal(cache.has('a'), false);

    // And the cache returns "3" for key "c"
    assert.equal(cache.get('c'), '3');
  });
});
