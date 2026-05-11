/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of notifications-hex-contract-test in this repository.
 * @sidecar notifications-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/notifications/', import.meta.url);

test('notifications has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('notifications has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('notifications has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('exagonal') || content.includes('notification'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createNotification, 'function');
  assert.equal(typeof mod.shouldAutoDismiss, 'function');
  assert.equal(typeof mod.assertNotificationPort, 'function');
  assert.equal(typeof mod.createMemoryNotificationAdapter, 'function');
  assert.equal(typeof mod.createDomNotificationAdapter, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/notification.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/notification-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/dom-adapter.mjs', BASE)));
});

test('unit test file exists for the notifications module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/notifications.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/notifications.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/notifications/domain/"));
  assert.ok(!content.includes("from '../../modules/notifications/ports/"));
  assert.ok(!content.includes("from '../../modules/notifications/adapters/"));
});
