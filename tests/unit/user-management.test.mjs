/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for user-management module — registration, verification, invitation, password reset.
 * @sidecar user-management.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx user-management
 * @public false
 * @edit careful
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUser,
  verifyEmail,
  createInvitation,
  createPasswordReset,
  isTokenValid,
  updateProfile,
  assertUserManagementPort,
  createMemoryUserManagementAdapter,
} from '../../modules/user-management/public-api.mjs';

describe('user-management domain — registerUser()', () => {
  test('creates user in pending_verification state', () => {
    const result = registerUser({ email: 'alice@example.com', displayName: 'Alice' });
    assert.ok(result.ok);
    assert.equal(result.user.status, 'pending_verification');
    assert.equal(result.user.email, 'alice@example.com');
    assert.ok(result.verificationToken.startsWith('vrf_'));
  });

  test('rejects invalid email', () => {
    const result = registerUser({ email: 'not-an-email' });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid-email');
  });
});

describe('user-management domain — verifyEmail()', () => {
  test('activates pending user', () => {
    const { user } = registerUser({ email: 'alice@example.com' });
    const result = verifyEmail(user);
    assert.ok(result.ok);
    assert.equal(result.user.status, 'active');
    assert.ok(result.user.verifiedAt);
  });

  test('rejects non-pending user', () => {
    const { user } = registerUser({ email: 'alice@example.com' });
    const active = { ...user, status: 'active' };
    const result = verifyEmail(active);
    assert.equal(result.ok, false);
  });
});

describe('user-management domain — invitation()', () => {
  test('creates invitation with token and expiry', () => {
    const inv = createInvitation('bob@example.com', 'usr_1');
    assert.ok(inv.token.startsWith('inv_'));
    assert.equal(inv.status, 'pending');
    assert.equal(inv.email, 'bob@example.com');
  });
});

describe('user-management domain — password reset()', () => {
  test('creates reset request with expiry', () => {
    const req = createPasswordReset('usr_1', 30);
    assert.ok(req.token.startsWith('rst_'));
    assert.equal(req.used, false);
  });

  test('isTokenValid returns true for fresh token', () => {
    const req = createPasswordReset('usr_1');
    assert.ok(isTokenValid(req));
  });

  test('isTokenValid returns false for used token', () => {
    const req = { ...createPasswordReset('usr_1'), used: true };
    assert.equal(isTokenValid(req), false);
  });

  test('isTokenValid returns false for expired token', () => {
    const req = { ...createPasswordReset('usr_1'), expiresAt: '2020-01-01T00:00:00Z' };
    assert.equal(isTokenValid(req), false);
  });
});

describe('user-management domain — updateProfile()', () => {
  test('updates display name', () => {
    const { user } = registerUser({ email: 'alice@example.com', displayName: 'Alice' });
    const updated = updateProfile(user, { displayName: 'Alice Smith' });
    assert.equal(updated.displayName, 'Alice Smith');
    assert.equal(updated.email, 'alice@example.com');
  });
});

describe('user-management adapter — memory', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMemoryUserManagementAdapter();
  });

  test('satisfies port contract', () => {
    assert.doesNotThrow(() => assertUserManagementPort(adapter));
  });

  test('register + getByEmail', async () => {
    const { user } = await adapter.register({ email: 'alice@example.com' });
    const found = await adapter.getByEmail('alice@example.com');
    assert.equal(found.id, user.id);
  });

  test('register + verifyEmail', async () => {
    const { verificationToken } = await adapter.register({ email: 'alice@example.com' });
    const verified = await adapter.verifyEmail(verificationToken);
    assert.equal(verified.status, 'active');
  });

  test('invite + acceptInvitation', async () => {
    const inv = await adapter.invite('bob@example.com', 'usr_1');
    const accepted = await adapter.acceptInvitation(inv.token);
    assert.equal(accepted.status, 'accepted');
  });

  test('requestPasswordReset + resetPassword', async () => {
    await adapter.register({ email: 'alice@example.com' });
    const req = await adapter.requestPasswordReset('alice@example.com');
    await adapter.resetPassword(req.token, 'new-hash');
    // Second use should fail
    await assert.rejects(() => adapter.resetPassword(req.token, 'again'), /expired/);
  });

  test('suspend + delete', async () => {
    const { user } = await adapter.register({ email: 'alice@example.com' });
    await adapter.suspend(user.id);
    const suspended = await adapter.getById(user.id);
    assert.equal(suspended.status, 'suspended');
    await adapter.delete(user.id);
    const deleted = await adapter.getById(user.id);
    assert.equal(deleted.status, 'deleted');
  });

  test('clear', async () => {
    await adapter.register({ email: 'alice@example.com' });
    adapter.clear();
    assert.equal(await adapter.getByEmail('alice@example.com'), null);
  });
});
