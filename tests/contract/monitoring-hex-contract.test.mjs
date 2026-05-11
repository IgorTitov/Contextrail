/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the monitoring bounded module follows the hex architecture contract.
 * @sidecar monitoring-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/monitoring/', import.meta.url);

test('monitoring has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('monitoring has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('monitoring has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('hexagonal'), 'README should mention hexagonal architecture');
});

test('public-api.mjs exports domain, port assert, and all adapters', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.buildExceptionEvent, 'function');
  assert.equal(typeof mod.buildMessageEvent, 'function');
  assert.equal(typeof mod.buildMetric, 'function');
  assert.equal(typeof mod.finalizeSpan, 'function');
  assert.equal(typeof mod.redact, 'function');
  assert.equal(typeof mod.redactContext, 'function');
  assert.equal(typeof mod.shouldSample, 'function');
  assert.equal(typeof mod.assertMonitoringPort, 'function');
  assert.equal(typeof mod.createMemoryMonitoringAdapter, 'function');
  assert.equal(typeof mod.createConsoleMonitoringAdapter, 'function');
  assert.equal(typeof mod.createNoOpMonitoringAdapter, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/monitoring.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/monitoring-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/console-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/no-op-adapter.mjs', BASE)));
});

test('unit test file exists for the monitoring module', () => {
  const testPath = new URL('../../tests/unit/monitoring.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/monitoring.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/monitoring.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/monitoring/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/monitoring/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/monitoring/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
