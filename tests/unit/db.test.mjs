/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of db-test in this repository.
 * @sidecar db.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDatabasePort,
  createQueryBuilder,
  createMemoryDatabaseAdapter,
  createSqlDriverAdapter,
} from '../../modules/db/public-api.mjs';

// ---------------------------------------------------------------------------
// assertDatabasePort
// ---------------------------------------------------------------------------

describe('db port — assertDatabasePort()', () => {
  test('accepts a valid adapter with all 4 methods', () => {
    const adapter = {
      query: () => ({ rows: [], rowCount: 0 }),
      execute: () => ({ rows: [], rowCount: 0 }),
      transaction: () => {},
      close: () => {},
    };
    assert.doesNotThrow(() => assertDatabasePort(adapter));
  });

  test('throws for null', () => {
    assert.throws(() => assertDatabasePort(null), TypeError);
  });

  test('throws for undefined', () => {
    assert.throws(() => assertDatabasePort(undefined), TypeError);
  });

  test('throws for a primitive', () => {
    assert.throws(() => assertDatabasePort('not an adapter'), TypeError);
  });

  test('throws for missing query', () => {
    assert.throws(
      () => assertDatabasePort({ execute: () => {}, transaction: () => {}, close: () => {} }),
      TypeError,
    );
  });

  test('throws for missing execute', () => {
    assert.throws(
      () => assertDatabasePort({ query: () => {}, transaction: () => {}, close: () => {} }),
      TypeError,
    );
  });

  test('throws for missing transaction', () => {
    assert.throws(
      () => assertDatabasePort({ query: () => {}, execute: () => {}, close: () => {} }),
      TypeError,
    );
  });

  test('throws for missing close', () => {
    assert.throws(
      () => assertDatabasePort({ query: () => {}, execute: () => {}, transaction: () => {} }),
      TypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// createQueryBuilder
// ---------------------------------------------------------------------------

describe('db domain — createQueryBuilder()', () => {
  test('builds a simple SELECT *', () => {
    const { sql, params } = createQueryBuilder('users').build();
    assert.equal(sql, 'SELECT * FROM users');
    assert.deepEqual(params, []);
  });

  test('select specific columns', () => {
    const { sql } = createQueryBuilder('users').select('name', 'age').build();
    assert.equal(sql, 'SELECT name, age FROM users');
  });

  test('where clause with param', () => {
    const { sql, params } = createQueryBuilder('users').where('age > ?', 25).build();
    assert.equal(sql, 'SELECT * FROM users WHERE age > ?');
    assert.deepEqual(params, [25]);
  });

  test('multiple where clauses (AND)', () => {
    const { sql, params } = createQueryBuilder('users')
      .where('age > ?', 25)
      .where('name = ?', 'Alice')
      .build();
    assert.equal(sql, 'SELECT * FROM users WHERE age > ? AND name = ?');
    assert.deepEqual(params, [25, 'Alice']);
  });

  test('orderBy', () => {
    const { sql } = createQueryBuilder('users').orderBy('name').build();
    assert.equal(sql, 'SELECT * FROM users ORDER BY name ASC');
  });

  test('orderBy DESC', () => {
    const { sql } = createQueryBuilder('users').orderBy('name', 'DESC').build();
    assert.equal(sql, 'SELECT * FROM users ORDER BY name DESC');
  });

  test('limit', () => {
    const { sql } = createQueryBuilder('users').limit(10).build();
    assert.equal(sql, 'SELECT * FROM users LIMIT 10');
  });

  test('offset', () => {
    const { sql } = createQueryBuilder('users').limit(10).offset(20).build();
    assert.equal(sql, 'SELECT * FROM users LIMIT 10 OFFSET 20');
  });

  test('full chain', () => {
    const { sql, params } = createQueryBuilder('orders')
      .select('id', 'total')
      .where('status = ?', 'pending')
      .orderBy('total', 'DESC')
      .limit(5)
      .build();
    assert.equal(sql, 'SELECT id, total FROM orders WHERE status = ? ORDER BY total DESC LIMIT 5');
    assert.deepEqual(params, ['pending']);
  });

  test('throws without table name', () => {
    assert.throws(() => createQueryBuilder(''), Error);
  });
});

// ---------------------------------------------------------------------------
// MemoryDatabaseAdapter
// ---------------------------------------------------------------------------

describe('db adapter — memoryDatabaseAdapter', () => {
  /** @type {import('../../modules/db/ports/database-port.mjs').DatabasePort} */
  let db;

  beforeEach(() => {
    db = createMemoryDatabaseAdapter();
  });

  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertDatabasePort(db));
  });

  test('CREATE TABLE + INSERT + SELECT round-trip', () => {
    db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT, name TEXT, age INTEGER)');
    db.execute('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', ['u1', 'Alice', 30]);
    db.execute('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', ['u2', 'Bob', 25]);

    const result = db.query('SELECT * FROM users');
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].name, 'Alice');
    assert.equal(result.rows[1].name, 'Bob');
  });

  test('SELECT with WHERE', () => {
    db.execute('CREATE TABLE IF NOT EXISTS items (id TEXT, price INTEGER)');
    db.execute('INSERT INTO items (id, price) VALUES (?, ?)', ['a', 10]);
    db.execute('INSERT INTO items (id, price) VALUES (?, ?)', ['b', 20]);

    const result = db.query('SELECT * FROM items WHERE id = ?', ['b']);
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].price, 20);
  });

  test('SELECT specific columns', () => {
    db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT, name TEXT)');
    db.execute('INSERT INTO users (id, name) VALUES (?, ?)', ['u1', 'Alice']);

    const result = db.query('SELECT name FROM users');
    assert.equal(result.rows[0].name, 'Alice');
    assert.equal(result.rows[0].id, undefined);
  });

  test('SELECT with ORDER BY', () => {
    db.execute('CREATE TABLE IF NOT EXISTS nums (val INTEGER)');
    db.execute('INSERT INTO nums (val) VALUES (?)', [3]);
    db.execute('INSERT INTO nums (val) VALUES (?)', [1]);
    db.execute('INSERT INTO nums (val) VALUES (?)', [2]);

    const asc = db.query('SELECT * FROM nums ORDER BY val ASC');
    assert.deepEqual(
      asc.rows.map((r) => r.val),
      [1, 2, 3],
    );

    const desc = db.query('SELECT * FROM nums ORDER BY val DESC');
    assert.deepEqual(
      desc.rows.map((r) => r.val),
      [3, 2, 1],
    );
  });

  test('SELECT with LIMIT', () => {
    db.execute('CREATE TABLE IF NOT EXISTS nums (val INTEGER)');
    db.execute('INSERT INTO nums (val) VALUES (?)', [1]);
    db.execute('INSERT INTO nums (val) VALUES (?)', [2]);
    db.execute('INSERT INTO nums (val) VALUES (?)', [3]);

    const result = db.query('SELECT * FROM nums LIMIT 2');
    assert.equal(result.rowCount, 2);
  });

  test('UPDATE modifies rows', () => {
    db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT, name TEXT)');
    db.execute('INSERT INTO users (id, name) VALUES (?, ?)', ['u1', 'Alice']);
    db.execute('INSERT INTO users (id, name) VALUES (?, ?)', ['u2', 'Bob']);

    const updateResult = db.execute('UPDATE users SET name = ? WHERE id = ?', ['Alicia', 'u1']);
    assert.equal(updateResult.rowCount, 1);

    const result = db.query('SELECT * FROM users WHERE id = ?', ['u1']);
    assert.equal(result.rows[0].name, 'Alicia');
  });

  test('DELETE removes rows', () => {
    db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT, name TEXT)');
    db.execute('INSERT INTO users (id, name) VALUES (?, ?)', ['u1', 'Alice']);
    db.execute('INSERT INTO users (id, name) VALUES (?, ?)', ['u2', 'Bob']);

    const delResult = db.execute('DELETE FROM users WHERE id = ?', ['u1']);
    assert.equal(delResult.rowCount, 1);

    const result = db.query('SELECT * FROM users');
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].name, 'Bob');
  });

  test('transaction executes operations', () => {
    db.execute('CREATE TABLE IF NOT EXISTS counter (val INTEGER)');
    db.execute('INSERT INTO counter (val) VALUES (?)', [0]);

    db.transaction((tx) => {
      tx.execute('UPDATE counter SET val = ?', [42]);
    });

    const result = db.query('SELECT * FROM counter');
    assert.equal(result.rows[0].val, 42);
  });

  test('close clears all tables', () => {
    db.execute('CREATE TABLE IF NOT EXISTS t (x TEXT)');
    db.execute('INSERT INTO t (x) VALUES (?)', ['hi']);
    db.close();
    const result = db.query('SELECT * FROM t');
    assert.equal(result.rowCount, 0);
  });

  test('query on non-existent table returns empty', () => {
    const result = db.query('SELECT * FROM nonexistent');
    assert.equal(result.rowCount, 0);
    assert.deepEqual(result.rows, []);
  });
});

// ---------------------------------------------------------------------------
// SqlDriverAdapter
// ---------------------------------------------------------------------------

describe('db adapter — sqlDriverAdapter', () => {
  test('satisfies the port contract', () => {
    const mockDriver = {
      query: () => ({ rows: [], rowCount: 0 }),
      close: () => {},
    };
    const db = createSqlDriverAdapter({ driver: mockDriver });
    assert.doesNotThrow(() => assertDatabasePort(db));
  });

  test('delegates query to driver', () => {
    const calls = [];
    const mockDriver = {
      query(sql, params) {
        calls.push({ sql, params });
        return { rows: [{ id: 1 }], rowCount: 1 };
      },
      close: () => {},
    };
    const db = createSqlDriverAdapter({ driver: mockDriver });
    const result = db.query('SELECT * FROM users WHERE id = ?', [1]);
    assert.equal(result.rowCount, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].sql, 'SELECT * FROM users WHERE id = ?');
  });

  test('delegates execute to driver', () => {
    const calls = [];
    const mockDriver = {
      query(sql, params) {
        calls.push({ sql, params });
        return { rows: [], rowCount: 1 };
      },
      close: () => {},
    };
    const db = createSqlDriverAdapter({ driver: mockDriver });
    db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
    assert.equal(calls.length, 1);
  });

  test('transaction wraps with BEGIN/COMMIT', () => {
    const calls = [];
    const mockDriver = {
      query(sql, params) {
        calls.push(sql);
        return { rows: [], rowCount: 0 };
      },
      close: () => {},
    };
    const db = createSqlDriverAdapter({ driver: mockDriver });
    db.transaction((tx) => {
      tx.execute('INSERT INTO t (x) VALUES (?)', ['v']);
    });
    assert.equal(calls[0], 'BEGIN');
    assert.ok(calls[1].includes('INSERT'));
    assert.equal(calls[2], 'COMMIT');
  });

  test('transaction rolls back on error', () => {
    const calls = [];
    const mockDriver = {
      query(sql) {
        calls.push(sql);
        return { rows: [], rowCount: 0 };
      },
      close: () => {},
    };
    const db = createSqlDriverAdapter({ driver: mockDriver });
    assert.throws(
      () => {
        db.transaction(() => {
          throw new Error('boom');
        });
      },
      { message: 'boom' },
    );
    assert.equal(calls[0], 'BEGIN');
    assert.equal(calls[1], 'ROLLBACK');
  });

  test('close delegates to driver', () => {
    let closed = false;
    const mockDriver = {
      query: () => ({ rows: [], rowCount: 0 }),
      close: () => {
        closed = true;
      },
    };
    const db = createSqlDriverAdapter({ driver: mockDriver });
    db.close();
    assert.equal(closed, true);
  });
});
