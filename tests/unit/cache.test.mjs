/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the cache port contract, the isExpired domain helper, the LRU tracker, and the in-memory LRU adapter through pure unit tests.
 * @sidecar cache.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the cache module — port + domain + memory adapter.
 * Storage-backed adapters (LocalStorage, Redis, IndexedDB) live in
 * cache-storage-adapters.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCachePort,
  isExpired,
  createLruTracker,
  createMemoryLruAdapter,
} from '../../modules/cache/public-api.mjs';

// --- assertCachePort ---

describe('cache port — assertCachePort()', () => {
  test('accepts a valid adapter with all 7 methods', () => {
    const adapter = {
      get: () => {},
      set: () => {},
      delete: () => {},
      has: () => {},
      clear: () => {},
      size: () => 0,
      keys: () => [],
    };
    assert.doesNotThrow(() => assertCachePort(adapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertCachePort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertCachePort(undefined), TypeError);
  });

  test('throws for a primitive', () => {
    assert.throws(() => assertCachePort('not an adapter'), TypeError);
  });

  test('throws for missing get', () => {
    const adapter = {
      set: () => {},
      delete: () => {},
      has: () => {},
      clear: () => {},
      size: () => 0,
      keys: () => [],
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });

  test('throws for missing set', () => {
    const adapter = {
      get: () => {},
      delete: () => {},
      has: () => {},
      clear: () => {},
      size: () => 0,
      keys: () => [],
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });

  test('throws for missing delete', () => {
    const adapter = {
      get: () => {},
      set: () => {},
      has: () => {},
      clear: () => {},
      size: () => 0,
      keys: () => [],
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });

  test('throws for missing has', () => {
    const adapter = {
      get: () => {},
      set: () => {},
      delete: () => {},
      clear: () => {},
      size: () => 0,
      keys: () => [],
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });

  test('throws for missing clear', () => {
    const adapter = {
      get: () => {},
      set: () => {},
      delete: () => {},
      has: () => {},
      size: () => 0,
      keys: () => [],
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });

  test('throws for missing size', () => {
    const adapter = {
      get: () => {},
      set: () => {},
      delete: () => {},
      has: () => {},
      clear: () => {},
      keys: () => [],
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });

  test('throws for missing keys', () => {
    const adapter = {
      get: () => {},
      set: () => {},
      delete: () => {},
      has: () => {},
      clear: () => {},
      size: () => 0,
    };
    assert.throws(() => assertCachePort(adapter), TypeError);
  });
});

// --- isExpired ---

describe('cache domain — isExpired()', () => {
  test('returns false when no TTL is set', () => {
    const entry = { value: 'x', createdAt: 1000, accessedAt: 1000 };
    assert.equal(isExpired(entry), false);
  });

  test('returns false when TTL is zero', () => {
    const entry = { value: 'x', createdAt: 1000, accessedAt: 1000, ttl: 0 };
    assert.equal(isExpired(entry), false);
  });

  test('returns false when entry is still within TTL', () => {
    const now = Date.now();
    const entry = { value: 'x', createdAt: now - 1000, accessedAt: now, ttl: 5000 };
    assert.equal(isExpired(entry, now), false);
  });

  test('returns true when entry has exceeded TTL', () => {
    const now = Date.now();
    const entry = { value: 'x', createdAt: now - 10000, accessedAt: now, ttl: 5000 };
    assert.equal(isExpired(entry, now), true);
  });

  test('returns true when entry is exactly at TTL boundary + 1ms', () => {
    const entry = { value: 'x', createdAt: 1000, accessedAt: 1000, ttl: 500 };
    assert.equal(isExpired(entry, 1501), true);
  });

  test('returns false when entry is exactly at TTL boundary', () => {
    const entry = { value: 'x', createdAt: 1000, accessedAt: 1000, ttl: 500 };
    assert.equal(isExpired(entry, 1500), false);
  });
});

// --- createLruTracker ---

describe('cache domain — createLruTracker()', () => {
  test('starts with empty order', () => {
    const tracker = createLruTracker(3);
    assert.deepEqual(tracker.getOrder(), []);
  });

  test('touch adds a key to the order', () => {
    const tracker = createLruTracker(3);
    tracker.touch('a');
    assert.deepEqual(tracker.getOrder(), ['a']);
  });

  test('touch moves existing key to the end', () => {
    const tracker = createLruTracker(3);
    tracker.touch('a');
    tracker.touch('b');
    tracker.touch('a');
    assert.deepEqual(tracker.getOrder(), ['b', 'a']);
  });

  test('evictNext returns the least-recently-used key', () => {
    const tracker = createLruTracker(3);
    tracker.touch('a');
    tracker.touch('b');
    tracker.touch('c');
    assert.equal(tracker.evictNext(), 'a');
    assert.deepEqual(tracker.getOrder(), ['b', 'c']);
  });

  test('evictNext returns undefined when empty', () => {
    const tracker = createLruTracker(3);
    assert.equal(tracker.evictNext(), undefined);
  });

  test('remove deletes a specific key', () => {
    const tracker = createLruTracker(3);
    tracker.touch('a');
    tracker.touch('b');
    tracker.touch('c');
    tracker.remove('b');
    assert.deepEqual(tracker.getOrder(), ['a', 'c']);
  });

  test('remove is a no-op for missing key', () => {
    const tracker = createLruTracker(3);
    tracker.touch('a');
    tracker.remove('z');
    assert.deepEqual(tracker.getOrder(), ['a']);
  });
});

// --- MemoryLruAdapter ---

describe('cache adapter — MemoryLruAdapter', () => {
  test('satisfies the port contract', () => {
    const cache = createMemoryLruAdapter();
    assert.doesNotThrow(() => assertCachePort(cache));
  });

  test('get returns undefined for missing key', () => {
    const cache = createMemoryLruAdapter();
    assert.equal(cache.get('missing'), undefined);
  });

  test('set and get round-trip a value', () => {
    const cache = createMemoryLruAdapter();
    cache.set('key', 'value');
    assert.equal(cache.get('key'), 'value');
  });

  test('set overwrites existing entry', () => {
    const cache = createMemoryLruAdapter();
    cache.set('key', 'old');
    cache.set('key', 'new');
    assert.equal(cache.get('key'), 'new');
  });

  test('delete removes an entry and returns true', () => {
    const cache = createMemoryLruAdapter();
    cache.set('key', 'value');
    assert.equal(cache.delete('key'), true);
    assert.equal(cache.get('key'), undefined);
  });

  test('delete returns false for missing key', () => {
    const cache = createMemoryLruAdapter();
    assert.equal(cache.delete('missing'), false);
  });

  test('has returns true for existing key', () => {
    const cache = createMemoryLruAdapter();
    cache.set('key', 'value');
    assert.equal(cache.has('key'), true);
  });

  test('has returns false for missing key', () => {
    const cache = createMemoryLruAdapter();
    assert.equal(cache.has('missing'), false);
  });

  test('clear removes all entries', () => {
    const cache = createMemoryLruAdapter();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    assert.equal(cache.size(), 0);
    assert.deepEqual(cache.keys(), []);
  });

  test('size returns the number of entries', () => {
    const cache = createMemoryLruAdapter();
    assert.equal(cache.size(), 0);
    cache.set('a', 1);
    assert.equal(cache.size(), 1);
    cache.set('b', 2);
    assert.equal(cache.size(), 2);
  });

  test('keys returns all entry keys', () => {
    const cache = createMemoryLruAdapter();
    cache.set('a', 1);
    cache.set('b', 2);
    const k = cache.keys();
    assert.ok(k.includes('a'));
    assert.ok(k.includes('b'));
    assert.equal(k.length, 2);
  });

  test('TTL expiry — get returns undefined for expired entry', () => {
    const cache = createMemoryLruAdapter();
    const realNow = Date.now;
    let fakeTime = realNow.call(Date);
    Date.now = () => fakeTime;
    try {
      cache.set('key', 'value', { ttl: 100 });
      assert.equal(cache.get('key'), 'value');
      fakeTime += 200;
      assert.equal(cache.get('key'), undefined);
    } finally {
      Date.now = realNow;
    }
  });

  test('TTL expiry — has returns false for expired entry', () => {
    const cache = createMemoryLruAdapter();
    const realNow = Date.now;
    let fakeTime = realNow.call(Date);
    Date.now = () => fakeTime;
    try {
      cache.set('key', 'value', { ttl: 100 });
      assert.equal(cache.has('key'), true);
      fakeTime += 200;
      assert.equal(cache.has('key'), false);
    } finally {
      Date.now = realNow;
    }
  });

  test('TTL expiry — size excludes expired entries', () => {
    const cache = createMemoryLruAdapter();
    const realNow = Date.now;
    let fakeTime = realNow.call(Date);
    Date.now = () => fakeTime;
    try {
      cache.set('short', 'value', { ttl: 100 });
      cache.set('long', 'value', { ttl: 10000 });
      assert.equal(cache.size(), 2);
      fakeTime += 200;
      assert.equal(cache.size(), 1);
    } finally {
      Date.now = realNow;
    }
  });

  test('TTL expiry — keys excludes expired entries', () => {
    const cache = createMemoryLruAdapter();
    const realNow = Date.now;
    let fakeTime = realNow.call(Date);
    Date.now = () => fakeTime;
    try {
      cache.set('short', 'value', { ttl: 100 });
      cache.set('long', 'value', { ttl: 10000 });
      fakeTime += 200;
      assert.deepEqual(cache.keys(), ['long']);
    } finally {
      Date.now = realNow;
    }
  });

  test('LRU eviction — oldest entry evicted when maxEntries exceeded', () => {
    const cache = createMemoryLruAdapter({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.equal(cache.has('a'), false);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
  });

  test('LRU eviction — access recency protects recently-read entries', () => {
    const cache = createMemoryLruAdapter({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    assert.equal(cache.has('a'), true);
    assert.equal(cache.has('b'), false);
    assert.equal(cache.has('c'), true);
  });

  test('stores complex objects', () => {
    const cache = createMemoryLruAdapter();
    const obj = { nested: { array: [1, 2, 3] } };
    cache.set('obj', obj);
    assert.deepEqual(cache.get('obj'), obj);
  });

  test('defaultTtl option applies when no per-entry TTL is set', () => {
    const cache = createMemoryLruAdapter({ defaultTtl: 100 });
    const realNow = Date.now;
    let fakeTime = realNow.call(Date);
    Date.now = () => fakeTime;
    try {
      cache.set('key', 'value');
      assert.equal(cache.get('key'), 'value');
      fakeTime += 200;
      assert.equal(cache.get('key'), undefined);
    } finally {
      Date.now = realNow;
    }
  });
});
