/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the storage-backed cache adapters — LocalStorage (with namespace + JSON degradation), Redis (with mock client, write-through, and TTL), and IndexedDB (factory shape only in Node).
 * @sidecar cache-storage-adapters.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the cache module — storage-backed adapters.
 * Port + domain + memory adapter live in cache.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCachePort,
  createLocalStorageCacheAdapter,
  createIndexedDBCacheAdapter,
  createRedisCacheAdapter,
} from '../../modules/cache/public-api.mjs';

// --- LocalStorageCacheAdapter ---

describe('cache adapter — LocalStorageCacheAdapter', () => {
  /** @type {Record<string, string>} */
  let mockStore;

  beforeEach(() => {
    mockStore = {};
    globalThis.localStorage = {
      store: mockStore,
      getItem(k) {
        return mockStore[k] ?? null;
      },
      setItem(k, v) {
        mockStore[k] = String(v);
      },
      removeItem(k) {
        delete mockStore[k];
      },
      clear() {
        for (const k of Object.keys(mockStore)) delete mockStore[k];
      },
      get length() {
        return Object.keys(mockStore).length;
      },
      key(i) {
        return Object.keys(mockStore)[i];
      },
    };
  });

  test('satisfies the port contract', () => {
    const cache = createLocalStorageCacheAdapter();
    assert.doesNotThrow(() => assertCachePort(cache));
  });

  test('set and get round-trip a value', () => {
    const cache = createLocalStorageCacheAdapter();
    cache.set('key', 'value');
    assert.equal(cache.get('key'), 'value');
  });

  test('get returns undefined for missing key', () => {
    const cache = createLocalStorageCacheAdapter();
    assert.equal(cache.get('missing'), undefined);
  });

  test('delete removes an entry', () => {
    const cache = createLocalStorageCacheAdapter();
    cache.set('key', 'value');
    assert.equal(cache.delete('key'), true);
    assert.equal(cache.get('key'), undefined);
  });

  test('delete returns false for missing key', () => {
    const cache = createLocalStorageCacheAdapter();
    assert.equal(cache.delete('missing'), false);
  });

  test('has returns true for existing key', () => {
    const cache = createLocalStorageCacheAdapter();
    cache.set('key', 'value');
    assert.equal(cache.has('key'), true);
  });

  test('has returns false for missing key', () => {
    const cache = createLocalStorageCacheAdapter();
    assert.equal(cache.has('missing'), false);
  });

  test('clear removes only namespaced keys', () => {
    const cache = createLocalStorageCacheAdapter({ namespace: 'ns1' });
    cache.set('a', 1);
    cache.set('b', 2);
    globalThis.localStorage.setItem('other-key', 'survive');
    cache.clear();
    assert.equal(cache.size(), 0);
    assert.equal(globalThis.localStorage.getItem('other-key'), 'survive');
  });

  test('size returns number of entries', () => {
    const cache = createLocalStorageCacheAdapter();
    assert.equal(cache.size(), 0);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.size(), 2);
  });

  test('keys returns entry keys', () => {
    const cache = createLocalStorageCacheAdapter();
    cache.set('a', 1);
    cache.set('b', 2);
    const k = cache.keys();
    assert.ok(k.includes('a'));
    assert.ok(k.includes('b'));
    assert.equal(k.length, 2);
  });

  test('namespace isolation — different namespaces do not see each other', () => {
    const cache1 = createLocalStorageCacheAdapter({ namespace: 'ns1' });
    const cache2 = createLocalStorageCacheAdapter({ namespace: 'ns2' });
    cache1.set('key', 'from-ns1');
    cache2.set('key', 'from-ns2');
    assert.equal(cache1.get('key'), 'from-ns1');
    assert.equal(cache2.get('key'), 'from-ns2');
  });

  test('TTL expiry — get returns undefined for expired entry', () => {
    const cache = createLocalStorageCacheAdapter();
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

  test('graceful degradation when localStorage unavailable', () => {
    const saved = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      const cache = createLocalStorageCacheAdapter();
      assert.doesNotThrow(() => assertCachePort(cache));
      cache.set('key', 'value');
      assert.equal(cache.get('key'), undefined);
      assert.equal(cache.has('key'), false);
      assert.equal(cache.delete('key'), false);
      assert.equal(cache.size(), 0);
      assert.deepEqual(cache.keys(), []);
      assert.doesNotThrow(() => cache.clear());
    } finally {
      globalThis.localStorage = saved;
    }
  });

  test('handles JSON parse errors gracefully', () => {
    const cache = createLocalStorageCacheAdapter({ namespace: 'bad' });
    globalThis.localStorage.setItem('cache:bad:broken', 'not-valid-json{{{');
    assert.equal(cache.get('broken'), undefined);
  });

  test('stores complex objects via JSON serialization', () => {
    const cache = createLocalStorageCacheAdapter();
    const obj = { nested: { array: [1, 2, 3] } };
    cache.set('obj', obj);
    assert.deepEqual(cache.get('obj'), obj);
  });
});

// --- RedisCacheAdapter ---

describe('cache adapter — RedisCacheAdapter (mock client)', () => {
  /** @type {Map<string, string>} */
  let store;
  /** @type {Map<string, number>} */
  let expiries;
  /** @type {import('../../modules/cache/adapters/redis-adapter.mjs').RedisClient} */
  let mockClient;

  beforeEach(() => {
    store = new Map();
    expiries = new Map();
    mockClient = {
      async get(key) {
        return store.get(key) ?? null;
      },
      async set(key, value) {
        store.set(key, value);
      },
      async del(key) {
        const had = store.has(key) ? 1 : 0;
        store.delete(key);
        return had;
      },
      async exists(key) {
        return store.has(key) ? 1 : 0;
      },
      async keys(pattern) {
        const prefix = pattern.replace('*', '');
        return [...store.keys()].filter((k) => k.startsWith(prefix));
      },
      async dbsize() {
        return store.size;
      },
      async pexpire(key, ms) {
        expiries.set(key, ms);
        return 1;
      },
    };
  });

  test('satisfies the port contract', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    assert.doesNotThrow(() => assertCachePort(cache));
  });

  test('set and get round-trip a value', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    cache.set('key', 'value');
    assert.equal(cache.get('key'), 'value');
  });

  test('get returns undefined for missing key', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    assert.equal(cache.get('missing'), undefined);
  });

  test('delete removes an entry and returns true', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    cache.set('key', 'value');
    assert.equal(cache.delete('key'), true);
    assert.equal(cache.get('key'), undefined);
  });

  test('delete returns false for missing key', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    assert.equal(cache.delete('missing'), false);
  });

  test('has returns true for existing key', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    cache.set('key', 'value');
    assert.equal(cache.has('key'), true);
  });

  test('has returns false for missing key', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    assert.equal(cache.has('missing'), false);
  });

  test('clear removes all entries', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    assert.equal(cache.size(), 0);
    assert.deepEqual(cache.keys(), []);
  });

  test('size returns the number of entries', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    assert.equal(cache.size(), 0);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.size(), 2);
  });

  test('keys returns all entry keys', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    cache.set('a', 1);
    cache.set('b', 2);
    const k = cache.keys();
    assert.ok(k.includes('a'));
    assert.ok(k.includes('b'));
    assert.equal(k.length, 2);
  });

  test('write-through sends data to Redis', async () => {
    const cache = createRedisCacheAdapter({ client: mockClient, namespace: 'test' });
    cache.set('key', { hello: 'world' });
    await new Promise((r) => setTimeout(r, 10));
    const raw = await mockClient.get('cache:test:key');
    assert.equal(raw, JSON.stringify({ hello: 'world' }));
  });

  test('TTL is forwarded to Redis pexpire', async () => {
    const cache = createRedisCacheAdapter({ client: mockClient, namespace: 'ttl' });
    cache.set('key', 'value', { ttl: 5000 });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(expiries.get('cache:ttl:key'), 5000);
  });

  test('defaultTtl applies when no per-entry TTL is set', async () => {
    const cache = createRedisCacheAdapter({
      client: mockClient,
      namespace: 'dttl',
      defaultTtl: 3000,
    });
    cache.set('key', 'value');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(expiries.get('cache:dttl:key'), 3000);
  });

  test('TTL expiry in mirror — get returns undefined for expired entry', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
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

  test('maxEntries evicts oldest when exceeded', () => {
    const cache = createRedisCacheAdapter({ client: mockClient, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.equal(cache.has('a'), false);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
  });

  test('sync() pulls state from Redis into mirror', async () => {
    const cache = createRedisCacheAdapter({ client: mockClient, namespace: 'sync' });
    store.set('cache:sync:ext', JSON.stringify('external'));
    assert.equal(cache.get('ext'), undefined);
    await cache.sync();
    assert.equal(cache.get('ext'), 'external');
  });

  test('namespace isolation', () => {
    const cache1 = createRedisCacheAdapter({ client: mockClient, namespace: 'ns1' });
    const cache2 = createRedisCacheAdapter({ client: mockClient, namespace: 'ns2' });
    cache1.set('key', 'from-ns1');
    cache2.set('key', 'from-ns2');
    assert.equal(cache1.get('key'), 'from-ns1');
    assert.equal(cache2.get('key'), 'from-ns2');
  });

  test('stores complex objects', () => {
    const cache = createRedisCacheAdapter({ client: mockClient });
    const obj = { nested: { array: [1, 2, 3] } };
    cache.set('obj', obj);
    assert.deepEqual(cache.get('obj'), obj);
  });
});

// --- IndexedDBCacheAdapter ---

describe('cache adapter — IndexedDBCacheAdapter', () => {
  test('factory function exists and is exported', () => {
    assert.equal(typeof createIndexedDBCacheAdapter, 'function');
  });

  test('factory returns a promise', () => {
    const result = createIndexedDBCacheAdapter();
    assert.ok(result instanceof Promise);
  });
});
