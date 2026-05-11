/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the node:sqlite-backed DatabasePort adapter exported from modules/db.
 * @sidecar db-node-sqlite.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { assertDatabasePort, createNodeSqliteAdapter } from '../../modules/db/public-api.mjs';

/**
 * Skip the entire suite on Node engines that do not ship node:sqlite.
 * The adapter must still be importable on those engines (verified by
 * the public-api import above succeeding); only the factory call is gated.
 */
function nodeSqliteAvailable() {
  const [major, minor] = process.versions.node.split('.').map((n) => Number(n));
  if (major > 22) return true;
  if (major === 22 && minor >= 5) return true;
  return false;
}

const skipReason = nodeSqliteAvailable()
  ? false
  : 'node:sqlite requires Node ≥22.5 — skipping on this engine';

describe('createNodeSqliteAdapter — port conformance', { skip: skipReason }, () => {
  test('factory returns an object that satisfies DatabasePort', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      assert.doesNotThrow(() => assertDatabasePort(adapter));
    } finally {
      adapter.close();
    }
  });

  test('defaults to an in-memory database when no location is given', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      const r = adapter.query('SELECT * FROM t');
      assert.deepEqual(r.rows, []);
      assert.equal(r.rowCount, 0);
    } finally {
      adapter.close();
    }
  });
});

describe('createNodeSqliteAdapter — query/execute', { skip: skipReason }, () => {
  test('execute() reports rowCount via the underlying changes count', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      const r1 = adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
      assert.equal(r1.rowCount, 1);
      assert.deepEqual(r1.rows, []);
      const r2 = adapter.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);
      assert.equal(r2.rowCount, 1);
    } finally {
      adapter.close();
    }
  });

  test('query() returns all rows for a SELECT', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE k (key TEXT, value TEXT)');
      adapter.execute('INSERT INTO k VALUES (?, ?)', ['a', '1']);
      adapter.execute('INSERT INTO k VALUES (?, ?)', ['b', '2']);
      const r = adapter.query('SELECT key, value FROM k ORDER BY key');
      assert.equal(r.rowCount, 2);
      assert.deepEqual(r.rows, [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
      ]);
    } finally {
      adapter.close();
    }
  });

  test('query() with WHERE binds parameters positionally', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE u (id INTEGER, name TEXT)');
      adapter.execute('INSERT INTO u VALUES (?, ?)', [1, 'Alice']);
      adapter.execute('INSERT INTO u VALUES (?, ?)', [2, 'Bob']);
      const r = adapter.query('SELECT name FROM u WHERE id = ?', [2]);
      assert.equal(r.rowCount, 1);
      assert.equal(r.rows[0].name, 'Bob');
    } finally {
      adapter.close();
    }
  });
});

describe('createNodeSqliteAdapter — transactions', { skip: skipReason }, () => {
  test('transaction() commits all writes when fn returns normally', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE t (n INTEGER)');
      adapter.transaction((tx) => {
        tx.execute('INSERT INTO t VALUES (?)', [1]);
        tx.execute('INSERT INTO t VALUES (?)', [2]);
      });
      const r = adapter.query('SELECT n FROM t ORDER BY n');
      assert.equal(r.rowCount, 2);
      assert.deepEqual(
        r.rows.map((row) => row.n),
        [1, 2],
      );
    } finally {
      adapter.close();
    }
  });

  test('transaction() rolls back when fn throws', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE t (n INTEGER)');
      adapter.execute('INSERT INTO t VALUES (?)', [99]);
      assert.throws(() => {
        adapter.transaction((tx) => {
          tx.execute('INSERT INTO t VALUES (?)', [1]);
          throw new Error('boom');
        });
      }, /boom/);
      const r = adapter.query('SELECT n FROM t');
      assert.equal(r.rowCount, 1);
      assert.equal(r.rows[0].n, 99);
    } finally {
      adapter.close();
    }
  });

  test('transaction() exposes a tx.query that sees in-flight writes', () => {
    const adapter = createNodeSqliteAdapter();
    try {
      adapter.execute('CREATE TABLE t (n INTEGER)');
      let seenInsideTx = -1;
      adapter.transaction((tx) => {
        tx.execute('INSERT INTO t VALUES (?)', [42]);
        const r = tx.query('SELECT n FROM t');
        seenInsideTx = r.rows[0].n;
      });
      assert.equal(seenInsideTx, 42);
    } finally {
      adapter.close();
    }
  });
});

describe('createNodeSqliteAdapter — close()', { skip: skipReason }, () => {
  test('close() makes further calls throw', () => {
    const adapter = createNodeSqliteAdapter();
    adapter.execute('CREATE TABLE x (n INTEGER)');
    adapter.close();
    assert.throws(() => adapter.query('SELECT * FROM x'));
  });
});
