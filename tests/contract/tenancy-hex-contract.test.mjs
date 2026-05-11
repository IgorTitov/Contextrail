/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the tenancy bounded module follows the hex architecture contract.
 * @sidecar tenancy-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/tenancy/', import.meta.url);

test('tenancy has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('tenancy has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('tenancy has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port assert, and adapters', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createTenant, 'function');
  assert.equal(typeof mod.createTenantContext, 'function');
  assert.equal(typeof mod.requireTenant, 'function');
  assert.equal(typeof mod.withTenant, 'function');
  assert.equal(typeof mod.resolveTenantFromHeaders, 'function');
  assert.equal(typeof mod.resolveTenantFromSubdomain, 'function');
  assert.equal(typeof mod.assertTenantStorePort, 'function');
  assert.equal(typeof mod.createMemoryTenantStore, 'function');
  assert.equal(typeof mod.createAlsTenantContext, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/tenant.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/tenant-context.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/tenant-resolver.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/tenant-store-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-tenant-store.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/als-tenant-context.mjs', BASE)));
});

test('unit test file exists for the tenancy module', () => {
  const testPath = new URL('../../tests/unit/tenancy.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/tenancy.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/tenancy.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/tenancy/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/tenancy/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/tenancy/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
