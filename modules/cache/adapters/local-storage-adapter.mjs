/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Local Storage adapter for the cache module.
 * @sidecar local-storage-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * localStorage-backed cache adapter with LRU tracking.
 * Implements the CachePort contract.
 * Stores entries as JSON under a namespaced key pattern: cache:<namespace>:<key>
 * LRU order tracked via a metadata key: cache:<namespace>:__lru_order__
 *
 * SpecRefs: TPL-144
 *
 * @typedef {import('../ports/cache-port.mjs').CachePortOptions & { namespace?: string }} LocalStorageCacheOptions
 */

/**
 * @param {LocalStorageCacheOptions} [options]
 * @returns {import('../ports/cache-port.mjs').CachePort}
 */
export function createLocalStorageCacheAdapter(options = {}) {
  const { maxEntries = Infinity, defaultTtl, namespace = 'default' } = options;

  const prefix = `cache:${namespace}:`;
  const lruMetaKey = `${prefix}__lru_order__`;

  /**
   * Check whether localStorage is available.
   * @returns {boolean}
   */
  function isAvailable() {
    try {
      return typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage !== null;
    } catch {
      return false;
    }
  }

  /**
   * Build the full storage key.
   * @param {string} key
   * @returns {string}
   */
  function storageKey(key) {
    return `${prefix}${key}`;
  }

  /**
   * Read the LRU order array from localStorage.
   * @returns {string[]}
   */
  function readOrder() {
    if (!isAvailable()) return [];
    try {
      const raw = globalThis.localStorage.getItem(lruMetaKey);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Write the LRU order array to localStorage.
   * @param {string[]} order
   */
  function writeOrder(order) {
    if (!isAvailable()) return;
    try {
      globalThis.localStorage.setItem(lruMetaKey, JSON.stringify(order));
    } catch {
      // Graceful degradation — storage may be full
    }
  }

  /**
   * Touch a key in the LRU order (move to most-recent).
   * @param {string} key
   */
  function touchOrder(key) {
    const order = readOrder();
    const idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
    order.push(key);
    writeOrder(order);
  }

  /**
   * Remove a key from the LRU order.
   * @param {string} key
   */
  function removeFromOrder(key) {
    const order = readOrder();
    const idx = order.indexOf(key);
    if (idx >= 0) {
      order.splice(idx, 1);
      writeOrder(order);
    }
  }

  /**
   * Read a cache entry from localStorage.
   * @param {string} key
   * @returns {import('../ports/cache-port.mjs').CacheEntry | null}
   */
  function readEntry(key) {
    if (!isAvailable()) return null;
    try {
      const raw = globalThis.localStorage.getItem(storageKey(key));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      // Graceful degradation on JSON parse error — treat as missing
      return null;
    }
  }

  /**
   * Write a cache entry to localStorage.
   * @param {string} key
   * @param {import('../ports/cache-port.mjs').CacheEntry} entry
   */
  function writeEntry(key, entry) {
    if (!isAvailable()) return;
    try {
      globalThis.localStorage.setItem(storageKey(key), JSON.stringify(entry));
    } catch {
      // Graceful degradation — storage may be full
    }
  }

  /**
   * Remove a cache entry from localStorage.
   * @param {string} key
   */
  function removeEntry(key) {
    if (!isAvailable()) return;
    try {
      globalThis.localStorage.removeItem(storageKey(key));
    } catch {
      // Graceful degradation
    }
  }

  /**
   * Check if an entry is expired and remove it if so.
   * @param {string} key
   * @returns {boolean}
   */
  function checkAndRemoveExpired(key) {
    const entry = readEntry(key);
    if (!entry) return false;
    if (entry.ttl != null && entry.ttl > 0 && Date.now() > entry.createdAt + entry.ttl) {
      removeEntry(key);
      removeFromOrder(key);
      return true;
    }
    return false;
  }

  /**
   * Evict least-recently-used entries until within maxEntries limit.
   */
  function evictIfNeeded() {
    const order = readOrder();
    while (order.length > maxEntries) {
      const lruKey = order.shift();
      if (lruKey != null) {
        removeEntry(lruKey);
      }
    }
    writeOrder(order);
  }

  /**
   * Get all non-expired cache keys in this namespace.
   * @returns {string[]}
   */
  function getAllKeys() {
    const order = readOrder();
    const valid = [];
    for (const key of order) {
      if (!checkAndRemoveExpired(key)) {
        if (readEntry(key) != null) {
          valid.push(key);
        }
      }
    }
    return valid;
  }

  return {
    get(key) {
      if (checkAndRemoveExpired(key)) return undefined;
      const entry = readEntry(key);
      if (!entry) return undefined;
      entry.accessedAt = Date.now();
      writeEntry(key, entry);
      touchOrder(key);
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
      writeEntry(key, entry);
      touchOrder(key);
      evictIfNeeded();
    },

    delete(key) {
      const entry = readEntry(key);
      if (!entry) return false;
      removeEntry(key);
      removeFromOrder(key);
      return true;
    },

    has(key) {
      if (checkAndRemoveExpired(key)) return false;
      return readEntry(key) != null;
    },

    clear() {
      if (!isAvailable()) return;
      const order = readOrder();
      for (const key of order) {
        removeEntry(key);
      }
      try {
        globalThis.localStorage.removeItem(lruMetaKey);
      } catch {
        // Graceful degradation
      }
    },

    size() {
      return getAllKeys().length;
    },

    keys() {
      return getAllKeys();
    },
  };
}
