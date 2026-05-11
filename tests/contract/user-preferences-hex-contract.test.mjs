/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of user-preferences-hex-contract-test in this repository.
 * @sidecar user-preferences-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/user-preferences/', import.meta.url);

test('user-preferences has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    const dirUrl = new URL(`${dir}/`, BASE);
    assert.ok(existsSync(dirUrl), `${dir}/ directory must exist`);
  }
});

test('user-preferences has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('user-preferences has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.defaultPreferences, 'function');
  assert.equal(typeof mod.mergePreferences, 'function');
  assert.equal(typeof mod.isValidPreferences, 'function');
  assert.equal(typeof mod.assertStoragePort, 'function');
  assert.equal(typeof mod.createMemoryAdapter, 'function');
  assert.equal(typeof mod.createLocalStorageAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/preferences.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/storage-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/local-storage-adapter.mjs', BASE)));
});

test('unit test file exists for the user-preferences module', () => {
  const testPath = new URL('../../tests/unit/user-preferences.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/user-preferences.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/user-preferences/domain/"));
  assert.ok(!content.includes("from '../../modules/user-preferences/ports/"));
  assert.ok(!content.includes("from '../../modules/user-preferences/adapters/"));
});
