/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Indexeddb adapter for the cache module.
 * @sidecar indexeddb-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * IndexedDB-backed cache adapter.
 * Loads all entries into memory on init to keep the CachePort contract synchronous,
 * then syncs mutations back to IndexedDB asynchronously.
 *
 * Returns a Promise that resolves to a CachePort with an additional destroy() method.
 *
 * SpecRefs: TPL-145
 *
 * @typedef {import('../ports/cache-port.mjs').CachePortOptions & { dbName?: string }} IndexedDBCacheOptions
 */

/**
 * @param {IndexedDBCacheOptions} [options]
 * @returns {Promise<import('../ports/cache-port.mjs').CachePort & { destroy(): void }>}
 */
export async function createIndexedDBCacheAdapter(options = {}) {
  const { maxEntries = Infinity, defaultTtl, dbName = 'cache-db' } = options;

  const STORE_NAME = 'cache-entries';

  /** @type {Map<string, import('../ports/cache-port.mjs').CacheEntry>} */
  const store = new Map();

  /** @type {string[]} — LRU order: least-recent at front */
  let order = [];

  /** @type {IDBDatabase | null} */
  let db = null;

  /**
   * Check whether IndexedDB is available.
   * @returns {boolean}
   */
  function isAvailable() {
    try {
      return typeof globalThis.indexedDB !== 'undefined' && globalThis.indexedDB !== null;
    } catch {
      return false;
    }
  }

  /**
   * Open the IndexedDB database.
   * @returns {Promise<IDBDatabase>}
   */
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!isAvailable()) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      const request = globalThis.indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load all entries from IndexedDB into memory.
   * @param {IDBDatabase} database
   * @returns {Promise<void>}
   */
  function loadAll(database) {
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const objectStore = tx.objectStore(STORE_NAME);
      const request = objectStore.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.set(cursor.key.toString(), cursor.value);
          order.push(cursor.key.toString());
          cursor.continue();
        } else {
          // Sort by accessedAt for LRU order
          order.sort((a, b) => {
            const entryA = store.get(a);
            const entryB = store.get(b);
            return (entryA?.accessedAt ?? 0) - (entryB?.accessedAt ?? 0);
          });
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Persist a single entry to IndexedDB.
   * @param {string} key
   * @param {import('../ports/cache-port.mjs').CacheEntry} entry
   */
  function persistEntry(key, entry) {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry, key);
    } catch {
      // Graceful degradation
    }
  }

  /**
   * Remove a single entry from IndexedDB.
   * @param {string} key
   */
  function removePersistedEntry(key) {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch {
      // Graceful degradation
    }
  }

  /**
   * Clear all entries from IndexedDB.
   */
  function clearPersisted() {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {
      // Graceful degradation
    }
  }

  // --- LRU helpers ---

  function touchOrder(key) {
    const idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
    order.push(key);
  }

  function removeOrder(key) {
    const idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
  }

  function checkAndRemoveExpired(key) {
    const entry = store.get(key);
    if (!entry) return false;
    if (entry.ttl != null && entry.ttl > 0 && Date.now() > entry.createdAt + entry.ttl) {
      store.delete(key);
      removeOrder(key);
      removePersistedEntry(key);
      return true;
    }
    return false;
  }

  function evictIfNeeded() {
    while (store.size > maxEntries && order.length > 0) {
      const lruKey = order.shift();
      if (lruKey != null) {
        store.delete(lruKey);
        removePersistedEntry(lruKey);
      }
    }
  }

  // --- Init ---

  if (isAvailable()) {
    try {
      db = await openDB();
      await loadAll(db);
    } catch {
      // Graceful degradation — run as in-memory only
      db = null;
    }
  }

  return {
    get(key) {
      if (checkAndRemoveExpired(key)) return undefined;
      const entry = store.get(key);
      if (!entry) return undefined;
      entry.accessedAt = Date.now();
      touchOrder(key);
      persistEntry(key, entry);
      return entry.value;
    },

    set(key, value, setOptions = {}) {
      const ttl = setOptions.ttl ?? defaultTtl;
      const now = Date.now();
      /** @type {import('../ports/cache-port.mjs').CacheEntry} */
      const entry = {
        value,
        createdAt: now,
        accessedAt: now,
        ...(ttl != null ? { ttl } : {}),
        ...(setOptions.size != null ? { size: setOptions.size } : {}),
      };
      store.set(key, entry);
      touchOrder(key);
      evictIfNeeded();
      persistEntry(key, entry);
    },

    delete(key) {
      const existed = store.delete(key);
      if (existed) {
        removeOrder(key);
        removePersistedEntry(key);
      }
      return existed;
    },

    has(key) {
      if (checkAndRemoveExpired(key)) return false;
      return store.has(key);
    },

    clear() {
      store.clear();
      order = [];
      clearPersisted();
    },

    size() {
      for (const key of [...store.keys()]) {
        checkAndRemoveExpired(key);
      }
      return store.size;
    },

    keys() {
      for (const key of [...store.keys()]) {
        checkAndRemoveExpired(key);
      }
      return [...store.keys()];
    },

    destroy() {
      if (db) {
        db.close();
        db = null;
      }
    },
  };
}
