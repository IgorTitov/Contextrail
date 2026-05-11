/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Redis adapter for the cache module.
 * @sidecar redis-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * Redis-backed cache adapter (server-side).
 * Implements the CachePort contract using an injected Redis client.
 *
 * The client is injected via the factory options — no hard dependency on any
 * Redis library. Any client that implements `{ get, set, del, exists, keys,
 * dbsize, flushdb, pexpire }` works (e.g. ioredis, node-redis v4+).
 *
 * @typedef {object} RedisClient
 * @property {(key: string) => Promise<string|null>} get
 * @property {(key: string, value: string) => Promise<unknown>} set
 * @property {(key: string) => Promise<number>} del
 * @property {(key: string) => Promise<number>} exists
 * @property {(pattern: string) => Promise<string[]>} keys
 * @property {() => Promise<number>} dbsize
 * @property {(key: string, ms: number) => Promise<number>} pexpire
 *
 * @typedef {import('../ports/cache-port.mjs').CachePortOptions & {
 *   client: RedisClient,
 *   namespace?: string,
 * }} RedisCacheOptions
 */

/**
 * Create a Redis-backed CachePort adapter.
 *
 * All operations are **synchronous-shaped** to match the CachePort contract,
 * but internally delegate to the async Redis client. Where the port requires
 * a synchronous return value (get, has, size, keys), the adapter maintains a
 * thin in-memory mirror that is updated on every write operation.
 *
 * For a fully async workflow, consumers can await the `sync()` helper exposed
 * on the returned adapter to pull the latest state from Redis into the mirror.
 *
 * @param {RedisCacheOptions} options
 * @returns {import('../ports/cache-port.mjs').CachePort & { sync: () => Promise<void> }}
 */
export function createRedisCacheAdapter(options) {
  const { client, namespace = 'default', maxEntries = Infinity, defaultTtl } = options;

  const prefix = `cache:${namespace}:`;

  /** @type {Map<string, { value: *, createdAt: number, ttl?: number }>} */
  const mirror = new Map();

  /**
   * Build the namespaced Redis key.
   * @param {string} key
   * @returns {string}
   */
  function redisKey(key) {
    return `${prefix}${key}`;
  }

  /**
   * Check if a mirrored entry is expired.
   * @param {{ createdAt: number, ttl?: number }} entry
   * @returns {boolean}
   */
  function isEntryExpired(entry) {
    if (entry.ttl != null && entry.ttl > 0) {
      return Date.now() > entry.createdAt + entry.ttl;
    }
    return false;
  }

  /**
   * Fire-and-forget write-through to Redis.
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl]
   */
  function writeThrough(key, value, ttl) {
    const rk = redisKey(key);
    const payload = JSON.stringify(value);
    const p = client.set(rk, payload);
    if (ttl != null && ttl > 0) {
      p.then(() => client.pexpire(rk, ttl));
    }
  }

  /**
   * Fire-and-forget delete from Redis.
   * @param {string} key
   */
  function deleteThrough(key) {
    client.del(redisKey(key));
  }

  /**
   * Evict least-recently-inserted entries from the mirror when over capacity.
   */
  function evictIfNeeded() {
    if (maxEntries === Infinity) return;
    const keys = [...mirror.keys()];
    while (keys.length > maxEntries) {
      const lruKey = keys.shift();
      if (lruKey != null) {
        mirror.delete(lruKey);
        deleteThrough(lruKey);
      }
    }
  }

  return {
    get(key) {
      const entry = mirror.get(key);
      if (!entry) return undefined;
      if (isEntryExpired(entry)) {
        mirror.delete(key);
        deleteThrough(key);
        return undefined;
      }
      return entry.value;
    },

    set(key, value, setOptions = {}) {
      const ttl = setOptions.ttl ?? defaultTtl;
      const now = Date.now();
      mirror.set(key, {
        value,
        createdAt: now,
        ...(ttl != null ? { ttl } : {}),
      });
      writeThrough(key, value, ttl);
      evictIfNeeded();
    },

    delete(key) {
      const existed = mirror.has(key);
      mirror.delete(key);
      deleteThrough(key);
      return existed;
    },

    has(key) {
      const entry = mirror.get(key);
      if (!entry) return false;
      if (isEntryExpired(entry)) {
        mirror.delete(key);
        deleteThrough(key);
        return false;
      }
      return true;
    },

    clear() {
      for (const key of [...mirror.keys()]) {
        deleteThrough(key);
      }
      mirror.clear();
    },

    size() {
      for (const [key, entry] of [...mirror.entries()]) {
        if (isEntryExpired(entry)) {
          mirror.delete(key);
          deleteThrough(key);
        }
      }
      return mirror.size;
    },

    keys() {
      for (const [key, entry] of [...mirror.entries()]) {
        if (isEntryExpired(entry)) {
          mirror.delete(key);
          deleteThrough(key);
        }
      }
      return [...mirror.keys()];
    },

    /**
     * Pull current state from Redis into the in-memory mirror.
     * Call this after external writes or on startup to warm the mirror.
     */
    async sync() {
      const redisKeys = await client.keys(`${prefix}*`);
      mirror.clear();
      for (const rk of redisKeys) {
        const raw = await client.get(rk);
        if (raw != null) {
          const key = rk.slice(prefix.length);
          try {
            mirror.set(key, { value: JSON.parse(raw), createdAt: Date.now() });
          } catch {
            // Skip unparseable entries
          }
        }
      }
    },
  };
}
