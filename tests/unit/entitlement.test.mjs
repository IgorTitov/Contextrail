/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for permission entitlement check — role + plan access.
 * @sidecar entitlement.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx permission
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAccess } from '../../modules/permission/public-api.mjs';

const alwaysAllow = () => true;
const alwaysDeny = () => false;

describe('permission — checkAccess entitlement', () => {
  test('allows when role passes and no plan gating', () => {
    const user = { role: 'admin', planEntitlements: [] };
    const result = checkAccess(user, 'read', 'dashboard', {}, alwaysAllow);
    assert.equal(result.allowed, true);
  });

  test('denies when role fails', () => {
    const user = { role: 'guest', planEntitlements: ['export'] };
    const result = checkAccess(user, 'export', 'report', {}, alwaysDeny);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'role-denied');
  });

  test('denies when role passes but plan lacks entitlement', () => {
    const user = { role: 'editor', planEntitlements: ['basic-view'] };
    const result = checkAccess(user, 'export', 'report', { gatedFeature: 'export' }, alwaysAllow);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'plan-denied');
  });

  test('allows when role passes and plan has entitlement', () => {
    const user = { role: 'editor', planEntitlements: ['basic-view', 'export'] };
    const result = checkAccess(user, 'export', 'report', { gatedFeature: 'export' }, alwaysAllow);
    assert.equal(result.allowed, true);
  });

  test('no gatedFeature means role-only check', () => {
    const user = { role: 'admin', planEntitlements: [] };
    const result = checkAccess(user, 'anything', 'anywhere', undefined, alwaysAllow);
    assert.equal(result.allowed, true);
  });
});
