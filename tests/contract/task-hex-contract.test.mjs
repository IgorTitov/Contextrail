/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of task-hex-contract-test in this repository.
 * @sidecar task-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/task/', import.meta.url);

test('task has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('task has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('task has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'task');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('task has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('task') || content.includes('Task'),
    'README should describe the module',
  );
});

test('task has a messages.mjs i18n layer', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.assertTaskPort, 'function');
  assert.equal(typeof mod.createTaskLifecycle, 'function');
  assert.equal(typeof mod.serializeForTransfer, 'function');
  assert.equal(typeof mod.createWebWorkerAdapter, 'function');
  assert.equal(typeof mod.createMainThreadAdapter, 'function');
  assert.equal(typeof mod.t, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/task-lifecycle.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/serialize.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/task-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/main-thread-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/web-worker-adapter.mjs', BASE)));
});

test('unit test file exists for the task module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/task.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(new URL('../../tests/unit/task.test.mjs', import.meta.url), 'utf8');
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/task/domain/"));
  assert.ok(!content.includes("from '../../modules/task/ports/"));
  assert.ok(!content.includes("from '../../modules/task/adapters/"));
});

test('task has a types.d.ts file', () => {
  assert.ok(existsSync(new URL('types.d.ts', BASE)));
});

test('subdirectories have READMEs', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/README.md`, BASE)), `${dir}/README.md must exist`);
  }
});
