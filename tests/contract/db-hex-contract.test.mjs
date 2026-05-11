/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of db-hex-contract-test in this repository.
 * @sidecar db-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/db/', import.meta.url);

test('db has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('db has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('db has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'db');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('db has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('db') || content.includes('database'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertDatabasePort, 'function');
  assert.equal(typeof mod.createQueryBuilder, 'function');
  assert.equal(typeof mod.createMemoryDatabaseAdapter, 'function');
  assert.equal(typeof mod.createSqlDriverAdapter, 'function');
  assert.equal(typeof mod.createNodeSqliteAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/query-builder.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/database-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/sql-driver-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/node-sqlite-adapter.mjs', BASE)));
});

test('unit test file exists for the db module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/db.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(new URL('../../tests/unit/db.test.mjs', import.meta.url), 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/db/domain/"));
  assert.ok(!content.includes("from '../../modules/db/ports/"));
  assert.ok(!content.includes("from '../../modules/db/adapters/"));
});
