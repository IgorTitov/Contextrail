/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of scheduler-hex-contract-test in this repository.
 * @sidecar scheduler-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/scheduler/', import.meta.url);

test('scheduler has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('scheduler has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('scheduler has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'scheduler');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('scheduler has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('scheduler') || content.includes('Scheduler'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertSchedulerPort, 'function');
  assert.equal(typeof mod.parseCronLike, 'function');
  assert.equal(typeof mod.addJitter, 'function');
  assert.equal(typeof mod.createIntervalAdapter, 'function');
  assert.equal(typeof mod.createIdleAdapter, 'function');
  assert.equal(typeof mod.createVisibilityAwareAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/cron-parser.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/jitter.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/scheduler-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/interval-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/idle-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/visibility-aware-adapter.mjs', BASE)));
});

test('scheduler has a messages.mjs for i18n', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});

test('unit test file exists for the scheduler module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/scheduler.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/scheduler.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/scheduler/domain/"));
  assert.ok(!content.includes("from '../../modules/scheduler/ports/"));
  assert.ok(!content.includes("from '../../modules/scheduler/adapters/"));
});
