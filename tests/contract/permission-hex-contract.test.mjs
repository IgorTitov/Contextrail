/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of permission-hex-contract-test in this repository.
 * @sidecar permission-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/permission/', import.meta.url);

test('permission has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('permission has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('permission has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'permission');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
  assert.ok(manifest.dependencies.modules.includes('auth'));
});

test('permission has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('permission'), 'README should describe the module');
  assert.ok(
    content.includes('exagonal') || content.includes('Hexagonal'),
    'README should mention hex architecture',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertPermissionPort, 'function');
  assert.equal(typeof mod.createRoleHierarchy, 'function');
  assert.equal(typeof mod.matchRule, 'function');
  assert.equal(typeof mod.createStaticRulesAdapter, 'function');
  assert.equal(typeof mod.createDynamicPermissionAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/role-hierarchy.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/rule-matcher.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/permission-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/static-rules-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/dynamic-adapter.mjs', BASE)));
});

test('permission has a messages.mjs i18n layer', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});

test('unit test file exists for the permission module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/permission.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/permission.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/permission/domain/"));
  assert.ok(!content.includes("from '../../modules/permission/ports/"));
  assert.ok(!content.includes("from '../../modules/permission/adapters/"));
});
