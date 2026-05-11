/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of db-test in this repository.
 * @sidecar db.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for db.feature.
 * Proves user-visible database behavior through the db module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertDatabasePort,
  createQueryBuilder,
  createMemoryDatabaseAdapter,
} from '../../modules/db/public-api.mjs';

const feature = readFileSync(new URL('./features/db.feature', import.meta.url), 'utf8');

describe('Feature: Database abstraction', () => {
  /** @type {ReturnType<typeof createMemoryDatabaseAdapter>} */
  let db;

  beforeEach(() => {
    db = createMemoryDatabaseAdapter();
    assertDatabasePort(db);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Database abstraction'));
    assert.ok(feature.includes('Scenario: Create table and insert a row'));
    assert.ok(feature.includes('Scenario: Query with WHERE equality filter'));
    assert.ok(feature.includes('Scenario: Query builder produces correct SQL'));
    assert.ok(feature.includes('Scenario: Transaction commits on success'));
    assert.ok(feature.includes('Scenario: Close clears all data'));
  });

  test('Scenario: Create table and insert a row', () => {
    // When the user creates a table "items"
    db.execute('CREATE TABLE IF NOT EXISTS items (name TEXT, qty INTEGER)');

    // And the user inserts a row
    db.execute('INSERT INTO items (name, qty) VALUES (?, ?)', ['Widget', 10]);

    // Then the query returns 1 row
    const result = db.query('SELECT * FROM items');
    assert.equal(result.rowCount, 1);

    // And the first row has correct values
    assert.equal(result.rows[0].name, 'Widget');
    assert.equal(result.rows[0].qty, 10);
  });

  test('Scenario: Query with WHERE equality filter', () => {
    // Given the table "products" contains rows
    db.execute('CREATE TABLE IF NOT EXISTS products (name TEXT, category TEXT)');
    db.execute('INSERT INTO products (name, category) VALUES (?, ?)', ['Apple', 'fruit']);
    db.execute('INSERT INTO products (name, category) VALUES (?, ?)', ['Banana', 'fruit']);
    db.execute('INSERT INTO products (name, category) VALUES (?, ?)', ['Carrot', 'veggie']);

    // When the user queries WHERE category = "fruit"
    const result = db.query('SELECT * FROM products WHERE category = ?', ['fruit']);

    // Then the result contains 2 rows
    assert.equal(result.rowCount, 2);
  });

  test('Scenario: Query builder produces correct SQL', () => {
    // When the user builds a query
    const { sql, params } = createQueryBuilder('users')
      .select('name', 'age')
      .where('age > ?', 25)
      .orderBy('name')
      .limit(5)
      .build();

    // Then the built SQL is correct
    assert.equal(sql, 'SELECT name, age FROM users WHERE age > ? ORDER BY name ASC LIMIT 5');

    // And the built params are correct
    assert.deepEqual(params, [25]);
  });

  test('Scenario: Transaction commits on success', () => {
    // Given the table "accounts" contains rows
    db.execute('CREATE TABLE IF NOT EXISTS accounts (owner TEXT, balance INTEGER)');
    db.execute('INSERT INTO accounts (owner, balance) VALUES (?, ?)', ['Alice', 100]);
    db.execute('INSERT INTO accounts (owner, balance) VALUES (?, ?)', ['Bob', 50]);

    // When the user runs a transaction that sets explicit balances
    db.transaction((tx) => {
      tx.execute('UPDATE accounts SET balance = ? WHERE owner = ?', [70, 'Alice']);
      tx.execute('UPDATE accounts SET balance = ? WHERE owner = ?', [80, 'Bob']);
    });

    // Then balances are updated
    const alice = db.query('SELECT * FROM accounts WHERE owner = ?', ['Alice']);
    assert.equal(alice.rows[0].balance, 70);

    const bob = db.query('SELECT * FROM accounts WHERE owner = ?', ['Bob']);
    assert.equal(bob.rows[0].balance, 80);
  });

  test('Scenario: Close clears all data', () => {
    // Given the table "temp" contains a row
    db.execute('CREATE TABLE IF NOT EXISTS temp (id TEXT, value TEXT)');
    db.execute('INSERT INTO temp (id, value) VALUES (?, ?)', ['x1', 'data']);
    assert.equal(db.query('SELECT * FROM temp').rowCount, 1);

    // When the user calls close
    db.close();

    // Then querying table "temp" returns 0 rows
    const result = db.query('SELECT * FROM temp');
    assert.equal(result.rowCount, 0);
  });
});
