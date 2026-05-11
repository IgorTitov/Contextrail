/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Indexeddb adapter for the user-preferences module.
 * @sidecar indexeddb-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx user-preferences
 * @public false
 * @edit careful
 */

/**
 * IndexedDB storage adapter for preference persistence.
 * Implements the StoragePort contract (sync load/save) over IndexedDB.
 *
 * The factory is async — it opens the database and loads the initial state
 * into an in-memory cache. After creation the adapter is fully synchronous:
 * load() reads from cache, save() writes to cache and persists in background.
 *
 * SpecRefs: TPL-029
 *
 * @param {object} [options]
 * @param {string} [options.dbName='user-prefs-db'] — IndexedDB database name
 * @param {string} [options.storeName='prefs'] — object store name
 * @param {string} [options.key='state'] — record key inside the store
 * @param {IDBFactory} [options.indexedDB] — injectable IDBFactory for testing
 * @returns {Promise<import('../ports/storage-port.mjs').StoragePort>}
 */
export async function createIndexedDBAdapter(options = {}) {
  const {
    dbName = 'user-prefs-db',
    storeName = 'prefs',
    key = 'state',
    indexedDB = globalThis.indexedDB,
  } = options;

  if (!indexedDB) {
    throw new Error('IndexedDB is not available');
  }

  const db = await openDB(indexedDB, dbName, storeName);

  // Load initial state into memory cache
  let cached = await idbGet(db, storeName, key);

  return {
    load() {
      return cached;
    },
    save(state) {
      cached = { ...state };
      // Fire-and-forget persistence
      idbPut(db, storeName, key, cached).catch(() => {
        // Silently degrade — cache is still valid
      });
    },
  };
}

/**
 * Open (or create) an IndexedDB database with the required object store.
 *
 * @param {IDBFactory} factory
 * @param {string} dbName
 * @param {string} storeName
 * @returns {Promise<IDBDatabase>}
 */
function openDB(factory, dbName, storeName) {
  return new Promise((resolve, reject) => {
    const request = factory.open(dbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read a record from an IndexedDB object store.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<object|null>}
 */
function idbGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Write a record to an IndexedDB object store.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} key
 * @param {object} value
 * @returns {Promise<void>}
 */
function idbPut(db, storeName, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const request = tx.objectStore(storeName).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
