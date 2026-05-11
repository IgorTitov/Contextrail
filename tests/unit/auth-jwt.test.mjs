/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the JWT auth adapter — token verification, claim validation (issuer / audience), HS256 + asymmetric keys, refresh tokens, custom claim mapping, and lifecycle.
 * @sidecar auth-jwt.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the auth module — createJwtAdapter.
 * Port + simple adapters live in auth.test.mjs; route guard,
 * authenticated client, and server-session adapter live in
 * auth-route-guard.test.mjs; OAuth provider adapters live in
 * auth-oauth.test.mjs.
 *
 * SpecRefs: TPL-070; TPL-218
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAuthPort,
  createJwtAdapter,
  createTestKeyPair,
  createTestSecret,
  signTestToken,
} from '../../modules/auth/public-api.mjs';

describe('createJwtAdapter', () => {
  /** @type {{ publicKey: import('jose').KeyLike, privateKey: import('jose').KeyLike }} */
  let keys;

  beforeEach(async () => {
    keys = await createTestKeyPair();
  });

  test('passes port assertion', async () => {
    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({
        accessToken: await signTestToken({
          claims: { sub: 'u1', name: 'User', role: 'user' },
          signingKey: keys.privateKey,
        }),
      }),
    });
    assert.doesNotThrow(() => assertAuthPort(adapter));
    adapter.destroy();
  });

  test('starts not authenticated', () => {
    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: '' }),
    });
    assert.equal(adapter.isAuthenticated(), false);
    assert.equal(adapter.getUser(), null);
    adapter.destroy();
  });

  test('login verifies token and extracts user from claims', async () => {
    const token = await signTestToken({
      claims: { sub: 'alice', name: 'Alice Smith', role: 'admin' },
      signingKey: keys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });

    const result = await adapter.login();
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'alice');
    assert.equal(result.user.displayName, 'Alice Smith');
    assert.equal(result.user.role, 'admin');
    assert.equal(result.user.accessToken, token);
    assert.equal(adapter.isAuthenticated(), true);
    adapter.destroy();
  });

  test('login fails with invalid token', async () => {
    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: 'not-a-valid-jwt' }),
    });

    const result = await adapter.login();
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.jwt.verification_failed');
    assert.equal(adapter.isAuthenticated(), false);
    adapter.destroy();
  });

  test('login fails when token is signed with wrong key', async () => {
    const otherKeys = await createTestKeyPair();
    const token = await signTestToken({
      claims: { sub: 'u1' },
      signingKey: otherKeys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });

    const result = await adapter.login();
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.jwt.verification_failed');
    adapter.destroy();
  });

  test('login validates issuer claim when configured', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1' },
      signingKey: keys.privateKey,
      issuer: 'wrong-issuer',
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      issuer: 'expected-issuer',
      loginFn: async () => ({ accessToken: token }),
    });

    const result = await adapter.login();
    assert.equal(result.success, false);
    adapter.destroy();
  });

  test('login validates audience claim when configured', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1' },
      signingKey: keys.privateKey,
      audience: 'wrong-audience',
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      audience: 'expected-audience',
      loginFn: async () => ({ accessToken: token }),
    });

    const result = await adapter.login();
    assert.equal(result.success, false);
    adapter.destroy();
  });

  test('login works with HS256 symmetric secret', async () => {
    const secret = await createTestSecret();
    const token = await signTestToken({
      claims: { sub: 'bob', name: 'Bob', role: 'user' },
      signingKey: secret,
      algorithm: 'HS256',
    });

    const adapter = createJwtAdapter({
      verifyKey: secret,
      algorithms: ['HS256'],
      loginFn: async () => ({ accessToken: token }),
    });

    const result = await adapter.login();
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'bob');
    adapter.destroy();
  });

  test('login fires auth-change listener', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1', name: 'User', role: 'user' },
      signingKey: keys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });

    /** @type {any} */
    let event = null;
    adapter.onAuthChange((e) => {
      event = e;
    });

    await adapter.login();
    assert.notEqual(event, null);
    assert.equal(event.type, 'login');
    assert.equal(event.user.id, 'u1');
    adapter.destroy();
  });

  test('logout clears user and fires auth-change', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1', name: 'User', role: 'user' },
      signingKey: keys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });

    await adapter.login();

    /** @type {any} */
    let event = null;
    adapter.onAuthChange((e) => {
      event = e;
    });

    await adapter.logout();
    assert.equal(adapter.isAuthenticated(), false);
    assert.equal(adapter.getUser(), null);
    assert.notEqual(event, null);
    assert.equal(event.type, 'logout');
    adapter.destroy();
  });

  test('stores refresh token when provided', async () => {
    const accessToken = await signTestToken({
      claims: { sub: 'u1', name: 'User', role: 'user' },
      signingKey: keys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken, refreshToken: 'refresh_abc' }),
    });

    const result = await adapter.login();
    assert.equal(result.user.refreshToken, 'refresh_abc');
    adapter.destroy();
  });

  test('custom mapClaims transforms JWT payload to AuthUser', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1', email: 'alice@example.com', permissions: 'superadmin' },
      signingKey: keys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
      mapClaims: (claims) => ({
        id: String(claims.sub),
        displayName: String(claims.email),
        role: String(claims.permissions),
      }),
    });

    const result = await adapter.login();
    assert.equal(result.user.displayName, 'alice@example.com');
    assert.equal(result.user.role, 'superadmin');
    adapter.destroy();
  });

  test('login propagates loginFn domain errors with auth. prefix', async () => {
    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => {
        throw new Error('auth.login.invalid_credentials');
      },
    });

    const result = await adapter.login();
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.login.invalid_credentials');
    adapter.destroy();
  });

  test('destroy cleans up without errors', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1', name: 'User', role: 'user' },
      signingKey: keys.privateKey,
      expiresIn: '1h',
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token, refreshToken: 'r1' }),
      refreshFn: async () => ({ accessToken: token }),
    });

    await adapter.login();
    assert.doesNotThrow(() => adapter.destroy());
  });

  test('separate factory calls are independent', async () => {
    const token = await signTestToken({
      claims: { sub: 'u1', name: 'User', role: 'user' },
      signingKey: keys.privateKey,
    });

    const a = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });
    const b = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });

    await a.login();
    assert.equal(a.isAuthenticated(), true);
    assert.equal(b.isAuthenticated(), false);
    a.destroy();
    b.destroy();
  });
});
