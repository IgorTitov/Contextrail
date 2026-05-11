/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the pwa bounded module follows the hex architecture contract.
 * @sidecar pwa-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/pwa/', import.meta.url);

test('pwa has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('pwa has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('pwa has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port assert, and adapter', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createWebManifest, 'function');
  assert.equal(typeof mod.webManifestToJson, 'function');
  assert.equal(typeof mod.createCacheStrategy, 'function');
  assert.equal(typeof mod.cacheFirst, 'function');
  assert.equal(typeof mod.networkFirst, 'function');
  assert.equal(typeof mod.staleWhileRevalidate, 'function');
  assert.equal(typeof mod.generateServiceWorkerSource, 'function');
  assert.equal(typeof mod.assertPwaAssetPort, 'function');
  assert.equal(typeof mod.createMemoryPwaAssetStore, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/web-manifest.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/cache-strategy.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/service-worker-source.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/pwa-asset-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-pwa-asset-store.mjs', BASE)));
});

test('unit test file exists for the pwa module', () => {
  const testPath = new URL('../../tests/unit/pwa.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/pwa.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/pwa.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/pwa/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/pwa/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/pwa/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
