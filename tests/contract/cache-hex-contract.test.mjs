/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of cache-hex-contract-test in this repository.
 * @sidecar cache-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/cache/', import.meta.url);

test('cache has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('cache has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('cache has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'cache');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('cache has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('cache') || content.includes('Cache'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertCachePort, 'function');
  assert.equal(typeof mod.isExpired, 'function');
  assert.equal(typeof mod.createLruTracker, 'function');
  assert.equal(typeof mod.createMemoryLruAdapter, 'function');
  assert.equal(typeof mod.createLocalStorageCacheAdapter, 'function');
  assert.equal(typeof mod.createIndexedDBCacheAdapter, 'function');
  assert.equal(typeof mod.createRedisCacheAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/cache-utils.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/cache-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-lru-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/local-storage-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/indexeddb-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/redis-adapter.mjs', BASE)));
});

test('unit test file exists for the cache module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/cache.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(new URL('../../tests/unit/cache.test.mjs', import.meta.url), 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/cache/domain/"));
  assert.ok(!content.includes("from '../../modules/cache/ports/"));
  assert.ok(!content.includes("from '../../modules/cache/adapters/"));
});
