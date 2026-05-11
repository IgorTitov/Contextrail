/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the cqrs bounded module follows the hex architecture contract.
 * @sidecar cqrs-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/cqrs/', import.meta.url);

test('cqrs has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('cqrs has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('cqrs has a README documenting the module', () => {
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
  assert.equal(typeof mod.createCommand, 'function');
  assert.equal(typeof mod.createQuery, 'function');
  assert.equal(typeof mod.createEvent, 'function');
  assert.equal(typeof mod.createAggregate, 'function');
  assert.equal(typeof mod.replayAggregate, 'function');
  assert.equal(typeof mod.assertCommandBusPort, 'function');
  assert.equal(typeof mod.assertQueryBusPort, 'function');
  assert.equal(typeof mod.assertEventStorePort, 'function');
  assert.equal(typeof mod.createMemoryCommandBus, 'function');
  assert.equal(typeof mod.createMemoryQueryBus, 'function');
  assert.equal(typeof mod.createMemoryEventStore, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/command.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/query.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/event.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/aggregate.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/command-bus-port.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/query-bus-port.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/event-store-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-command-bus.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-query-bus.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-event-store.mjs', BASE)));
});

test('unit test file exists for the cqrs module', () => {
  const testPath = new URL('../../tests/unit/cqrs.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/cqrs.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/cqrs.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/cqrs/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/cqrs/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/cqrs/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
