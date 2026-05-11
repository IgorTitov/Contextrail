/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify IndexedDB adapter satisfies StoragePort contract with sync-cache pattern using a minimal fake IDBFactory.
 * @sidecar indexeddb-adapter.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the IndexedDB storage adapter.
 *
 * Uses a minimal in-memory IDBFactory fake to test the adapter contract
 * without requiring a browser environment.
 *
 * SpecRefs: TPL-029
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createIndexedDBAdapter,
  assertStoragePort,
} from '../../modules/user-preferences/public-api.mjs';

// ---------------------------------------------------------------------------
// Minimal fake IndexedDB (just enough for the adapter under test)
// ---------------------------------------------------------------------------

function createFakeIDB() {
  /** @type {Map<string, Map<string, any>>} db -> store -> records */
  const databases = new Map();

  function getStore(dbName, storeName) {
    if (!databases.has(dbName)) databases.set(dbName, new Map());
    const db = databases.get(dbName);
    if (!db.has(storeName)) db.set(storeName, new Map());
    return db.get(storeName);
  }

  function fakeRequest(resultValue, errorValue = null) {
    const req = { result: resultValue, error: errorValue, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      if (errorValue && req.onerror) req.onerror();
      else if (req.onsuccess) req.onsuccess();
    });
    return req;
  }

  function fakeObjectStore(dbName, storeName) {
    return {
      get(key) {
        const store = getStore(dbName, storeName);
        return fakeRequest(store.get(key) ?? undefined);
      },
      put(value, key) {
        const store = getStore(dbName, storeName);
        store.set(key, structuredClone(value));
        return fakeRequest(undefined);
      },
    };
  }

  function fakeTransaction(dbName, storeName) {
    return {
      objectStore(name) {
        return fakeObjectStore(dbName, name);
      },
    };
  }

  function fakeDB(dbName, storeNames) {
    return {
      objectStoreNames: {
        contains(name) {
          return storeNames.has(name);
        },
      },
      createObjectStore(name) {
        storeNames.add(name);
      },
      transaction(storeName) {
        return fakeTransaction(dbName, storeName);
      },
    };
  }

  return {
    open(dbName, version) {
      const storeNames = new Set(databases.has(dbName) ? databases.get(dbName).keys() : []);

      const db = fakeDB(dbName, storeNames);
      const req = {
        result: db,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      queueMicrotask(() => {
        // Simulate upgrade if database is new
        if (!databases.has(dbName)) {
          databases.set(dbName, new Map());
          if (req.onupgradeneeded) req.onupgradeneeded();
        }
        if (req.onsuccess) req.onsuccess();
      });

      return req;
    },
    _databases: databases,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('indexeddb-adapter', () => {
  let fakeIDB;

  beforeEach(() => {
    fakeIDB = createFakeIDB();
  });

  it('throws when IndexedDB is not available', async () => {
    await assert.rejects(() => createIndexedDBAdapter({ indexedDB: null }), {
      message: /IndexedDB is not available/,
    });
  });

  it('creates an adapter that satisfies StoragePort', async () => {
    const adapter = await createIndexedDBAdapter({ indexedDB: fakeIDB });
    assertStoragePort(adapter);
  });

  it('load() returns null when no data has been saved', async () => {
    const adapter = await createIndexedDBAdapter({ indexedDB: fakeIDB });
    assert.equal(adapter.load(), null);
  });

  it('save() persists state and load() retrieves it', async () => {
    const adapter = await createIndexedDBAdapter({ indexedDB: fakeIDB });
    const state = { locale: 'en', theme: 'dark' };
    adapter.save(state);

    // load() returns from in-memory cache immediately
    const loaded = adapter.load();
    assert.deepEqual(loaded, state);
  });

  it('save() makes a defensive copy', async () => {
    const adapter = await createIndexedDBAdapter({ indexedDB: fakeIDB });
    const state = { locale: 'en', theme: 'light' };
    adapter.save(state);

    // Mutating the original should not affect the cached copy
    state.locale = 'fr';
    assert.equal(adapter.load().locale, 'en');
  });

  it('supports custom database and store names', async () => {
    const adapter = await createIndexedDBAdapter({
      indexedDB: fakeIDB,
      dbName: 'my-app',
      storeName: 'settings',
      key: 'user-state',
    });
    assertStoragePort(adapter);
    adapter.save({ locale: 'ru', theme: 'dark' });
    assert.deepEqual(adapter.load(), { locale: 'ru', theme: 'dark' });
  });

  it('loads persisted state on creation (warm start)', async () => {
    // First adapter saves data
    const adapter1 = await createIndexedDBAdapter({
      indexedDB: fakeIDB,
      dbName: 'warm-test',
    });
    adapter1.save({ locale: 'de', theme: 'system' });

    // Wait for background persistence
    await new Promise((r) => setTimeout(r, 10));

    // Second adapter opens the same database
    const adapter2 = await createIndexedDBAdapter({
      indexedDB: fakeIDB,
      dbName: 'warm-test',
    });
    assert.deepEqual(adapter2.load(), { locale: 'de', theme: 'system' });
  });

  it('multiple adapters with different dbNames are isolated', async () => {
    const a = await createIndexedDBAdapter({ indexedDB: fakeIDB, dbName: 'db-a' });
    const b = await createIndexedDBAdapter({ indexedDB: fakeIDB, dbName: 'db-b' });

    a.save({ locale: 'en', theme: 'light' });
    b.save({ locale: 'ru', theme: 'dark' });

    assert.equal(a.load().locale, 'en');
    assert.equal(b.load().locale, 'ru');
  });
});
