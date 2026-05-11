/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the email bounded module follows the hex architecture contract.
 * @sidecar email-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/email/', import.meta.url);

test('email has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('email has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('email has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port assert, and adapters', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createEmailMessage, 'function');
  assert.equal(typeof mod.isValidEmailAddress, 'function');
  assert.equal(typeof mod.assertEmailAddress, 'function');
  assert.equal(typeof mod.normalizeRecipients, 'function');
  assert.equal(typeof mod.recipientCount, 'function');
  assert.equal(typeof mod.assertEmailPort, 'function');
  assert.equal(typeof mod.createMemoryEmailAdapter, 'function');
  assert.equal(typeof mod.createConsoleEmailAdapter, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/email-message.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/email-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-email-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/console-email-adapter.mjs', BASE)));
});

test('unit test file exists for the email module', () => {
  const testPath = new URL('../../tests/unit/email.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/email.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/email.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/email/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/email/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/email/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
