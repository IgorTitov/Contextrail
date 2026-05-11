/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory Lru adapter for the cache module.
 * @sidecar memory-lru-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * In-memory LRU cache adapter.
 * Implements the CachePort contract with lazy TTL expiry and LRU eviction.
 *
 * SpecRefs: TPL-143
 *
 * @param {import('../ports/cache-port.mjs').CachePortOptions} [options]
 * @returns {import('../ports/cache-port.mjs').CachePort}
 */
export function createMemoryLruAdapter(options = {}) {
  const { maxEntries = Infinity, defaultTtl } = options;

  /** @type {Map<string, import('../ports/cache-port.mjs').CacheEntry>} */
  const store = new Map();

  /** @type {string[]} — LRU order: least-recent at front, most-recent at end */
  let order = [];

  /**
   * Move key to most-recent position in the LRU order.
   * @param {string} key
   */
  function touchOrder(key) {
    const idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
    order.push(key);
  }

  /**
   * Remove key from the LRU order.
   * @param {string} key
   */
  function removeOrder(key) {
    const idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
  }

  /**
   * Check if an entry is expired and remove it if so.
   * @param {string} key
   * @returns {boolean} true if the entry was expired and removed
   */
  function checkAndRemoveExpired(key) {
    const entry = store.get(key);
    if (!entry) return false;
    if (entry.ttl != null && entry.ttl > 0 && Date.now() > entry.createdAt + entry.ttl) {
      store.delete(key);
      removeOrder(key);
      return true;
    }
    return false;
  }

  /**
   * Evict least-recently-used entries until within maxEntries limit.
   */
  function evictIfNeeded() {
    while (store.size > maxEntries && order.length > 0) {
      const lruKey = order.shift();
      if (lruKey != null) {
        store.delete(lruKey);
      }
    }
  }

  return {
    get(key) {
      if (checkAndRemoveExpired(key)) return undefined;
      const entry = store.get(key);
      if (!entry) return undefined;
      entry.accessedAt = Date.now();
      touchOrder(key);
      return entry.value;
    },

    set(key, value, setOptions = {}) {
      const ttl = setOptions.ttl ?? defaultTtl;
      const now = Date.now();
      store.set(key, {
        value,
        createdAt: now,
        accessedAt: now,
        ...(ttl != null ? { ttl } : {}),
        ...(setOptions.size != null ? { size: setOptions.size } : {}),
      });
      touchOrder(key);
      evictIfNeeded();
    },

    delete(key) {
      const existed = store.delete(key);
      if (existed) removeOrder(key);
      return existed;
    },

    has(key) {
      if (checkAndRemoveExpired(key)) return false;
      return store.has(key);
    },

    clear() {
      store.clear();
      order = [];
    },

    size() {
      // Lazy expiry: clean expired entries first
      for (const key of [...store.keys()]) {
        checkAndRemoveExpired(key);
      }
      return store.size;
    },

    keys() {
      // Lazy expiry: clean expired entries first
      for (const key of [...store.keys()]) {
        checkAndRemoveExpired(key);
      }
      return [...store.keys()];
    },
  };
}
