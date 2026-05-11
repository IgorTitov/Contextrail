/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the job-queue bounded module follows the hex architecture contract.
 * @sidecar job-queue-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/job-queue/', import.meta.url);

test('job-queue has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('job-queue has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('job-queue has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port assert, adapter, and worker', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createJob, 'function');
  assert.equal(typeof mod.isReady, 'function');
  assert.equal(typeof mod.markRunning, 'function');
  assert.equal(typeof mod.markCompleted, 'function');
  assert.equal(typeof mod.markFailed, 'function');
  assert.equal(typeof mod.exponentialBackoff, 'function');
  assert.equal(typeof mod.validateEnqueue, 'function');
  assert.equal(typeof mod.assertJobQueuePort, 'function');
  assert.equal(typeof mod.createMemoryJobQueue, 'function');
  assert.equal(typeof mod.createJobWorker, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/job-lifecycle.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/worker.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/job-queue-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-job-queue.mjs', BASE)));
});

test('unit test file exists for the job-queue module', () => {
  const testPath = new URL('../../tests/unit/job-queue.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/job-queue.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/job-queue.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/job-queue/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/job-queue/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/job-queue/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
