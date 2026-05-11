/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the rate-limit bounded module follows the hex architecture contract.
 * @sidecar rate-limit-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/rate-limit/', import.meta.url);

test('rate-limit has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('rate-limit has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('rate-limit has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('hexagonal'), 'README should mention hexagonal architecture');
});

test('public-api.mjs exports domain, port assert, and memory adapter', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createBucketState, 'function');
  assert.equal(typeof mod.consume, 'function');
  assert.equal(typeof mod.refill, 'function');
  assert.equal(typeof mod.validateBucketConfig, 'function');
  assert.equal(typeof mod.assertRateLimiterPort, 'function');
  assert.equal(typeof mod.createMemoryRateLimiter, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/rate-limit.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/rate-limit-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/default-adapter.mjs', BASE)));
});

test('unit test file exists for the rate-limit module', () => {
  const testPath = new URL('../../tests/unit/rate-limit.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/rate-limit.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/rate-limit.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/rate-limit/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/rate-limit/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/rate-limit/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
