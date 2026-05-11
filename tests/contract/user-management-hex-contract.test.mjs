/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Hex contract test for the user-management module — structure, public API, no deep imports.
 * @sidecar user-management-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx user-management
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const MOD = join(import.meta.dirname ?? '.', '..', '..', 'modules', 'user-management');

describe('user-management hex contract', () => {
  test('required hex folders exist', () => {
    assert.ok(existsSync(join(MOD, 'domain')));
    assert.ok(existsSync(join(MOD, 'ports')));
    assert.ok(existsSync(join(MOD, 'adapters')));
  });

  test('public-api.mjs exists', () => {
    assert.ok(existsSync(join(MOD, 'public-api.mjs')));
  });

  test('public API exports expected surface', async () => {
    const api = await import('../../modules/user-management/public-api.mjs');
    assert.equal(typeof api.registerUser, 'function');
    assert.equal(typeof api.verifyEmail, 'function');
    assert.equal(typeof api.createInvitation, 'function');
    assert.equal(typeof api.createPasswordReset, 'function');
    assert.equal(typeof api.isTokenValid, 'function');
    assert.equal(typeof api.updateProfile, 'function');
    assert.equal(typeof api.assertUserManagementPort, 'function');
    assert.equal(typeof api.createMemoryUserManagementAdapter, 'function');
  });

  test('manifest.json has maturity field', async () => {
    const manifest = JSON.parse(
      (await import('node:fs')).readFileSync(join(MOD, 'manifest.json'), 'utf8'),
    );
    assert.ok(['stable', 'beta', 'example'].includes(manifest.maturity));
  });
});
