/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sqlite adapter for the state module.
 * @sidecar sqlite-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx state
 * @public false
 * @edit careful
 */

/**
 * SQLite-backed state adapter (server-side).
 * Implements StatePort using an injected database driver for persistence.
 *
 * The driver is injected via options — no hard dependency on any SQLite
 * library. Any driver implementing the minimal contract works:
 *   { run(sql, params), get(sql, params), all(sql, params) }
 *
 * State is stored as a JSON blob in a key-value table. The adapter provides
 * the same synchronous-shaped StatePort interface via an in-memory mirror
 * that is persisted to SQLite on every setState call.
 *
 * @typedef {object} SqliteDriver
 * @property {(sql: string, params?: any[]) => void} run — execute a write statement
 * @property {(sql: string, params?: any[]) => { value: string } | undefined} get — fetch one row
 * @property {(sql: string, params?: any[]) => Array<{ value: string }>} all — fetch all rows
 *
 * @typedef {object} SqliteStateOptions
 * @property {SqliteDriver} driver
 * @property {string} [table] — table name, default 'kv_state'
 * @property {string} [key] — state key, default 'app_state'
 */

/**
 * Create a SQLite-backed StatePort adapter.
 *
 * @template T
 * @param {T} initialState — default state if nothing persisted
 * @param {SqliteStateOptions} options
 * @returns {import('../ports/state-port.mjs').StatePort & { persist: () => void, load: () => void }}
 */
export function createSqliteStateAdapter(initialState, options) {
  const { driver, table = 'kv_state', key = 'app_state' } = options;

  /** @type {Set<(state: T) => void>} */
  const subscribers = new Set();

  // Ensure the table exists
  driver.run(`CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

  // Load persisted state or use initial
  /** @type {T} */
  let state = initialState;
  const row = driver.get(`SELECT value FROM ${table} WHERE key = ?`, [key]);
  if (row) {
    try {
      state = JSON.parse(row.value);
    } catch {
      // Corrupted data — fall back to initialState
    }
  }

  /**
   * Persist current state to SQLite.
   */
  function persist() {
    driver.run(`INSERT OR REPLACE INTO ${table} (key, value) VALUES (?, ?)`, [
      key,
      JSON.stringify(state),
    ]);
  }

  return {
    getState() {
      if (state !== null && typeof state === 'object' && !Array.isArray(state)) {
        return /** @type {T} */ ({ ...state });
      }
      return state;
    },

    /** @param {T | ((prev: T) => T)} updater */
    setState(updater) {
      const prev = state;
      state =
        typeof updater === 'function' ? /** @type {(prev: T) => T} */ (updater)(prev) : updater;
      if (state !== prev) {
        persist();
        for (const listener of subscribers) {
          listener(state);
        }
      }
    },

    /** @param {(state: T) => void} listener */
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('State listener must be a function');
      }
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },

    subscriberCount() {
      return subscribers.size;
    },

    /**
     * Manually persist current state to SQLite.
     */
    persist,

    /**
     * Reload state from SQLite, overwriting in-memory state.
     */
    load() {
      const r = driver.get(`SELECT value FROM ${table} WHERE key = ?`, [key]);
      if (r) {
        try {
          state = JSON.parse(r.value);
        } catch {
          // Keep current state on parse failure
        }
      }
    },
  };
}
