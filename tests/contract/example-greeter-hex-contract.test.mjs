/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the example-greeter bounded module follows the hexagonal architecture contract: public-api, domain, ports, adapters, and README.
 * @sidecar example-greeter-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const BASE = new URL('../../modules/example-greeter/', import.meta.url);

test('example-greeter has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    const dirUrl = new URL(`${dir}/`, BASE);
    assert.ok(existsSync(dirUrl), `${dir}/ directory must exist`);
  }
});

test('example-greeter has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('example-greeter has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('hexagonal'), 'README should mention hexagonal architecture');
});

test('public-api.mjs exports greet, assertGreetingPort, and defaultGreetingAdapter', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.greet, 'function', 'greet must be a function export');
  assert.equal(
    typeof mod.assertGreetingPort,
    'function',
    'assertGreetingPort must be a function export',
  );
  assert.equal(
    typeof mod.defaultGreetingAdapter,
    'object',
    'defaultGreetingAdapter must be an object export',
  );
  assert.equal(
    typeof mod.defaultGreetingAdapter.getTemplate,
    'function',
    'defaultGreetingAdapter.getTemplate must be a function',
  );
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/greeter.mjs', BASE)), 'domain/greeter.mjs must exist');
  assert.ok(
    existsSync(new URL('ports/greeting-port.mjs', BASE)),
    'ports/greeting-port.mjs must exist',
  );
  assert.ok(
    existsSync(new URL('adapters/default-adapter.mjs', BASE)),
    'adapters/default-adapter.mjs must exist',
  );
});

test('unit test file exists for the example-greeter module', () => {
  const testPath = new URL('../../tests/unit/example-greeter.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/example-greeter.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/example-greeter.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/example-greeter/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/example-greeter/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/example-greeter/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
