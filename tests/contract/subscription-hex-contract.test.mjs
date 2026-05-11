/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Hex contract test for the subscription module — structure, public API, no deep imports.
 * @sidecar subscription-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx subscription
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const MOD = join(import.meta.dirname ?? '.', '..', '..', 'modules', 'subscription');

describe('subscription hex contract', () => {
  test('required hex folders exist', () => {
    assert.ok(existsSync(join(MOD, 'domain')));
    assert.ok(existsSync(join(MOD, 'ports')));
    assert.ok(existsSync(join(MOD, 'adapters')));
  });

  test('public-api.mjs exists', () => {
    assert.ok(existsSync(join(MOD, 'public-api.mjs')));
  });

  test('public API exports expected surface', async () => {
    const api = await import('../../modules/subscription/public-api.mjs');
    assert.equal(typeof api.createSubscription, 'function');
    assert.equal(typeof api.hasEntitlement, 'function');
    assert.equal(typeof api.recordUsage, 'function');
    assert.equal(typeof api.transitionStatus, 'function');
    assert.equal(typeof api.changePlan, 'function');
    assert.equal(typeof api.canTransition, 'function');
    assert.equal(typeof api.assertSubscriptionPort, 'function');
    assert.equal(typeof api.createMemorySubscriptionAdapter, 'function');
  });

  test('manifest.json has maturity field', async () => {
    const manifest = JSON.parse(
      (await import('node:fs')).readFileSync(join(MOD, 'manifest.json'), 'utf8'),
    );
    assert.ok(['stable', 'beta', 'example'].includes(manifest.maturity));
  });
});
