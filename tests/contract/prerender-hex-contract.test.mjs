/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the prerender bounded module follows the hex architecture contract.
 * @sidecar prerender-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/prerender/', import.meta.url);

test('prerender has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('prerender has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('prerender has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port asserts, and adapters', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createRouteManifest, 'function');
  assert.equal(typeof mod.createRenderResult, 'function');
  assert.equal(typeof mod.createPrerenderPlan, 'function');
  assert.equal(typeof mod.planToTargets, 'function');
  assert.equal(typeof mod.assertRenderFunction, 'function');
  assert.equal(typeof mod.assertStaticOutputPort, 'function');
  assert.equal(typeof mod.createMemoryStaticOutput, 'function');
  assert.equal(typeof mod.createSequentialPrerenderRunner, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/route-manifest.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/render-result.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/prerender-plan.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/render-function-port.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/static-output-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-static-output.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/sequential-prerender-runner.mjs', BASE)));
});

test('unit test file exists for the prerender module', () => {
  const testPath = new URL('../../tests/unit/prerender.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/prerender.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/prerender.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/prerender/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/prerender/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/prerender/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
