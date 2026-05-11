/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test every public behavior of the state module: port assertion, memory adapter (getState, setState, subscribe, subscriberCount), persistent adapter (load, save, fallback), and error cases.
 * @sidecar state.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the state module.
 *
 * SpecRefs: TPL-048; TPL-049; TPL-050; TPL-051; TPL-052
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStatePort,
  createMemoryStateAdapter,
  createPersistentStateAdapter,
  createSqliteStateAdapter,
} from '../../modules/state/public-api.mjs';

/* -- StatePort contract assertion (TPL-051) -- */

describe('state port -- assertStatePort()', () => {
  test('accepts a conforming adapter', () => {
    const store = createMemoryStateAdapter({ count: 0 });
    assert.doesNotThrow(() => assertStatePort(store));
  });

  test('throws for null', () => {
    assert.throws(() => assertStatePort(null), TypeError);
  });

  test('throws for missing getState()', () => {
    assert.throws(
      () =>
        assertStatePort({
          setState: () => {},
          subscribe: () => () => {},
          subscriberCount: () => 0,
        }),
      TypeError,
    );
  });

  test('throws for missing subscribe()', () => {
    assert.throws(
      () =>
        assertStatePort({
          getState: () => {},
          setState: () => {},
          subscriberCount: () => 0,
        }),
      TypeError,
    );
  });
});

/* -- Memory state adapter (TPL-049) -- */

describe('state adapter -- memoryStateAdapter', () => {
  let store;

  beforeEach(() => {
    store = createMemoryStateAdapter({ count: 0, name: 'test' });
  });

  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertStatePort(store));
  });

  test('getState returns initial state', () => {
    const state = store.getState();
    assert.deepEqual(state, { count: 0, name: 'test' });
  });

  test('getState returns a copy (no shared references)', () => {
    const s1 = store.getState();
    s1.count = 999;
    const s2 = store.getState();
    assert.equal(s2.count, 0);
  });

  test('setState with direct value', () => {
    store.setState({ count: 5, name: 'updated' });
    assert.deepEqual(store.getState(), { count: 5, name: 'updated' });
  });

  test('setState with updater function', () => {
    store.setState((prev) => ({ ...prev, count: prev.count + 1 }));
    assert.equal(store.getState().count, 1);
  });

  test('subscribe receives new state on change', () => {
    const states = [];
    store.subscribe((s) => states.push(s));
    store.setState({ count: 1, name: 'test' });
    store.setState({ count: 2, name: 'test' });
    assert.equal(states.length, 2);
    assert.equal(states[0].count, 1);
    assert.equal(states[1].count, 2);
  });

  test('subscribe returns unsubscribe function', () => {
    let count = 0;
    const unsub = store.subscribe(() => {
      count++;
    });
    store.setState({ count: 1, name: 'test' });
    assert.equal(count, 1);
    unsub();
    store.setState({ count: 2, name: 'test' });
    assert.equal(count, 1);
  });

  test('subscriberCount tracks active subscribers', () => {
    assert.equal(store.subscriberCount(), 0);
    const unsub1 = store.subscribe(() => {});
    assert.equal(store.subscriberCount(), 1);
    const unsub2 = store.subscribe(() => {});
    assert.equal(store.subscriberCount(), 2);
    unsub1();
    assert.equal(store.subscriberCount(), 1);
    unsub2();
    assert.equal(store.subscriberCount(), 0);
  });

  test('setState does not notify if same reference', () => {
    const primitiveStore = createMemoryStateAdapter(42);
    let notified = false;
    primitiveStore.subscribe(() => {
      notified = true;
    });
    primitiveStore.setState(42);
    assert.equal(notified, false);
  });

  test('subscribe throws for non-function listener', () => {
    assert.throws(() => store.subscribe('not-a-function'), TypeError);
  });

  test('works with primitive state', () => {
    const numStore = createMemoryStateAdapter(0);
    numStore.setState(5);
    assert.equal(numStore.getState(), 5);
    numStore.setState((prev) => prev + 1);
    assert.equal(numStore.getState(), 6);
  });
});

/* -- Persistent state adapter (TPL-050) -- */

describe('state adapter -- persistentStateAdapter', () => {
  /** @returns {import('../../modules/user-preferences/ports/storage-port.mjs').StoragePort} */
  function createMockStorage(initial = null) {
    let stored = initial;
    return {
      load() {
        return stored;
      },
      save(state) {
        stored = state;
      },
    };
  }

  test('satisfies the port contract', () => {
    const storage = createMockStorage();
    const store = createPersistentStateAdapter({ count: 0 }, storage);
    assert.doesNotThrow(() => assertStatePort(store));
  });

  test('uses default state when storage is empty', () => {
    const storage = createMockStorage(null);
    const store = createPersistentStateAdapter({ count: 0 }, storage);
    assert.deepEqual(store.getState(), { count: 0 });
  });

  test('loads initial state from storage', () => {
    const storage = createMockStorage({ count: 42 });
    const store = createPersistentStateAdapter({ count: 0 }, storage);
    assert.equal(store.getState().count, 42);
  });

  test('persists state on every setState', () => {
    const storage = createMockStorage(null);
    const store = createPersistentStateAdapter({ count: 0 }, storage);
    store.setState({ count: 10 });
    assert.deepEqual(storage.load(), { count: 10 });
  });

  test('persists state with updater function', () => {
    const storage = createMockStorage(null);
    const store = createPersistentStateAdapter({ count: 0 }, storage);
    store.setState((prev) => ({ ...prev, count: prev.count + 5 }));
    assert.equal(storage.load().count, 5);
  });

  test('subscribers still fire with persistent adapter', () => {
    const storage = createMockStorage(null);
    const store = createPersistentStateAdapter({ count: 0 }, storage);
    let notified = false;
    store.subscribe(() => {
      notified = true;
    });
    store.setState({ count: 1 });
    assert.ok(notified);
  });
});

// ---------------------------------------------------------------------------
// SqliteStateAdapter
// ---------------------------------------------------------------------------

/**
 * Create a mock SQLite driver backed by a simple in-memory Map.
 * Simulates a single-table key-value store.
 */
function createMockSqliteDriver() {
  /** @type {Map<string, Map<string, string>>} */
  const tables = new Map();

  return {
    run(sql, params = []) {
      const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (createMatch) {
        const tableName = createMatch[1];
        if (!tables.has(tableName)) tables.set(tableName, new Map());
        return;
      }
      const insertMatch = sql.match(/INSERT OR REPLACE INTO (\w+)/);
      if (insertMatch) {
        const tableName = insertMatch[1];
        const table = tables.get(tableName);
        if (table) table.set(params[0], params[1]);
        return;
      }
    },
    get(sql, params = []) {
      const selectMatch = sql.match(/SELECT value FROM (\w+) WHERE key = \?/);
      if (selectMatch) {
        const table = tables.get(selectMatch[1]);
        const val = table?.get(params[0]);
        return val !== undefined ? { value: val } : undefined;
      }
      return undefined;
    },
    all(sql) {
      const selectMatch = sql.match(/SELECT .+ FROM (\w+)/);
      if (selectMatch) {
        const table = tables.get(selectMatch[1]);
        if (!table) return [];
        return [...table.entries()].map(([, value]) => ({ value }));
      }
      return [];
    },
  };
}

describe('state adapter — sqliteStateAdapter', () => {
  test('satisfies the port contract', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    assert.doesNotThrow(() => assertStatePort(store));
  });

  test('getState returns initial state when nothing persisted', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    assert.deepEqual(store.getState(), { count: 0 });
  });

  test('setState updates state and persists', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    store.setState({ count: 42 });
    assert.deepEqual(store.getState(), { count: 42 });

    // Verify persisted by reading raw from driver
    const row = driver.get('SELECT value FROM kv_state WHERE key = ?', ['app_state']);
    assert.deepEqual(JSON.parse(row.value), { count: 42 });
  });

  test('setState with updater function', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    store.setState((prev) => ({ ...prev, count: prev.count + 10 }));
    assert.deepEqual(store.getState(), { count: 10 });
  });

  test('subscribe is notified on state change', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    let notifiedState = null;
    store.subscribe((s) => {
      notifiedState = s;
    });
    store.setState({ count: 5 });
    assert.deepEqual(notifiedState, { count: 5 });
  });

  test('unsubscribe stops notifications', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    let calls = 0;
    const unsub = store.subscribe(() => {
      calls++;
    });
    store.setState({ count: 1 });
    assert.equal(calls, 1);
    unsub();
    store.setState({ count: 2 });
    assert.equal(calls, 1);
  });

  test('subscriberCount tracks subscribers', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    assert.equal(store.subscriberCount(), 0);
    const unsub = store.subscribe(() => {});
    assert.equal(store.subscriberCount(), 1);
    unsub();
    assert.equal(store.subscriberCount(), 0);
  });

  test('loads persisted state on creation', () => {
    const driver = createMockSqliteDriver();
    // First store persists state
    const store1 = createSqliteStateAdapter({ count: 0 }, { driver });
    store1.setState({ count: 99 });

    // Second store reads persisted state
    const store2 = createSqliteStateAdapter({ count: 0 }, { driver });
    assert.deepEqual(store2.getState(), { count: 99 });
  });

  test('custom table and key names', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ v: 1 }, { driver, table: 'my_table', key: 'my_key' });
    store.setState({ v: 2 });

    const row = driver.get('SELECT value FROM my_table WHERE key = ?', ['my_key']);
    assert.deepEqual(JSON.parse(row.value), { v: 2 });
  });

  test('load() refreshes state from SQLite', () => {
    const driver = createMockSqliteDriver();
    const store = createSqliteStateAdapter({ count: 0 }, { driver });
    store.setState({ count: 50 });

    // External write to driver (simulating another process)
    driver.run('INSERT OR REPLACE INTO kv_state', ['app_state', JSON.stringify({ count: 999 })]);
    store.load();
    assert.deepEqual(store.getState(), { count: 999 });
  });
});
