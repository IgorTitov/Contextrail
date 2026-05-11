/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the openapi bounded module follows the hex architecture contract: public-api, domain, ports, adapters, and README.
 * @sidecar openapi-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/openapi/', import.meta.url);

test('openapi has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('openapi has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('openapi has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('hexagonal'), 'README should mention hexagonal architecture');
});

test('public-api.mjs exports builder, port assert, and both adapters', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.buildOpenApiDocument, 'function');
  assert.equal(typeof mod.assertOpenApiDocumentPort, 'function');
  assert.equal(typeof mod.createStaticOpenApiAdapter, 'function');
  assert.equal(typeof mod.createRouteRegistryOpenApiAdapter, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/build-document.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/openapi-document-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/static-document-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/route-registry-adapter.mjs', BASE)));
});

test('unit test file exists for the openapi module', () => {
  const testPath = new URL('../../tests/unit/openapi.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/openapi.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/openapi.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/openapi/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/openapi/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/openapi/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
