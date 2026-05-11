/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the payments bounded module follows the hex architecture contract.
 * @sidecar payments-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/payments/', import.meta.url);

test('payments has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('payments has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('payments has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port assert, and adapter', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createMoney, 'function');
  assert.equal(typeof mod.addMoney, 'function');
  assert.equal(typeof mod.subtractMoney, 'function');
  assert.equal(typeof mod.formatMoney, 'function');
  assert.equal(typeof mod.validatePaymentIntentInput, 'function');
  assert.equal(typeof mod.nextConfirmStatus, 'function');
  assert.equal(typeof mod.nextRefundState, 'function');
  assert.equal(typeof mod.parseSignatureHeader, 'function');
  assert.equal(typeof mod.computeSignature, 'function');
  assert.equal(typeof mod.verifyWebhookSignature, 'function');
  assert.equal(typeof mod.assertPaymentsPort, 'function');
  assert.equal(typeof mod.createMemoryPaymentsAdapter, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/money.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/payment-intent.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/webhook-event.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/payments-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-payments-adapter.mjs', BASE)));
});

test('unit test file exists for the payments module', () => {
  const testPath = new URL('../../tests/unit/payments.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/payments.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/payments.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/payments/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/payments/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/payments/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
