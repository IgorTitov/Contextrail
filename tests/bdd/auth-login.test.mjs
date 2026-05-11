/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of auth-login-test in this repository.
 * @sidecar auth-login.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for auth-login.feature.
 * Proves user-visible authentication behavior through the auth module public API.
 *
 * SpecRefs: TPL-062; TPL-064; TPL-065; TPL-067
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertAuthPort,
  createAnonymousAdapter,
  createLocalPasswordAdapter,
  createJwtAdapter,
  createTestKeyPair,
  signTestToken,
  createRouteGuard,
} from '../../modules/auth/public-api.mjs';

const feature = readFileSync(new URL('./features/auth-login.feature', import.meta.url), 'utf8');

/** Simple in-memory storage adapter for test use. */
function createMemoryStorage() {
  let data = null;
  return {
    load: () => data,
    save: (d) => {
      data = d;
    },
  };
}

describe('Feature: User authentication', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: User authentication'));
    assert.ok(feature.includes('Scenario: Anonymous adapter is always authenticated'));
    assert.ok(feature.includes('Scenario: Login with the local password adapter'));
    assert.ok(feature.includes('Scenario: Login with wrong credentials fails'));
    assert.ok(feature.includes('Scenario: Logout resets authentication'));
    assert.ok(feature.includes('Scenario: Route guard allows public routes'));
    assert.ok(
      feature.includes('Scenario: Route guard blocks unauthenticated access to protected routes'),
    );
    assert.ok(
      feature.includes('Scenario: JWT adapter verifies a signed token and extracts user claims'),
    );
    assert.ok(feature.includes('Scenario: JWT adapter rejects an invalid token'));
  });

  test('Scenario: Anonymous adapter is always authenticated', () => {
    // Given the anonymous auth adapter is active
    const adapter = createAnonymousAdapter();
    assertAuthPort(adapter);

    // Then the user is authenticated
    assert.equal(adapter.isAuthenticated(), true);

    // And the user display name is "Anonymous"
    assert.equal(adapter.getUser().displayName, 'Anonymous');
  });

  test('Scenario: Login with the local password adapter', async () => {
    // Given the local password adapter is active
    const storage = createMemoryStorage();
    const adapter = createLocalPasswordAdapter(storage);
    assertAuthPort(adapter);

    // Register first (prerequisite for login)
    adapter.register('alice', 'secret123');

    // When the user logs in with username "alice" and password "secret123"
    const result = await adapter.login({ username: 'alice', password: 'secret123' });

    // Then the login succeeds
    assert.equal(result.success, true);

    // And the user display name is "alice"
    assert.equal(adapter.getUser().displayName, 'alice');
  });

  test('Scenario: Login with wrong credentials fails', async () => {
    // Given the local password adapter is active
    const storage = createMemoryStorage();
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('alice', 'secret123');

    // When the user logs in with username "alice" and password "wrong"
    const result = await adapter.login({ username: 'alice', password: 'wrong' });

    // Then the login fails
    assert.equal(result.success, false);
  });

  test('Scenario: Logout resets authentication', async () => {
    // Given the local password adapter is active
    const storage = createMemoryStorage();
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('alice', 'secret123');

    // And the user is logged in as "alice"
    await adapter.login({ username: 'alice', password: 'secret123' });
    assert.equal(adapter.isAuthenticated(), true);

    // When the user logs out
    await adapter.logout();

    // Then the user is not authenticated
    assert.equal(adapter.isAuthenticated(), false);
  });

  test('Scenario: Route guard allows public routes', () => {
    // Given the anonymous auth adapter is active
    const adapter = createAnonymousAdapter();

    // When the user navigates to a public route
    const guard = createRouteGuard(adapter);
    const decision = guard.canAccess({ path: '/home', requiresAuth: false });

    // Then access is allowed
    assert.equal(decision.allowed, true);
  });

  test('Scenario: JWT adapter verifies a signed token and extracts user claims', async () => {
    // Given the JWT auth adapter is active with a valid key pair
    const keys = await createTestKeyPair();
    const token = await signTestToken({
      claims: { sub: 'alice', name: 'alice', role: 'admin' },
      signingKey: keys.privateKey,
    });

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: token }),
    });
    assertAuthPort(adapter);

    // When the user logs in with a signed JWT for "alice" with role "admin"
    const result = await adapter.login();

    // Then the login succeeds
    assert.equal(result.success, true);

    // And the user display name is "alice"
    assert.equal(adapter.getUser().displayName, 'alice');
    adapter.destroy();
  });

  test('Scenario: JWT adapter rejects an invalid token', async () => {
    // Given the JWT auth adapter is active with a valid key pair
    const keys = await createTestKeyPair();

    const adapter = createJwtAdapter({
      verifyKey: keys.publicKey,
      loginFn: async () => ({ accessToken: 'invalid-token-data' }),
    });

    // When the user logs in with an invalid JWT
    const result = await adapter.login();

    // Then the login fails
    assert.equal(result.success, false);
    adapter.destroy();
  });

  test('Scenario: Route guard blocks unauthenticated access to protected routes', async () => {
    // Given the local password adapter is active
    const storage = createMemoryStorage();
    const adapter = createLocalPasswordAdapter(storage);

    // And the user is not logged in (no login call)

    // When the user navigates to a protected route
    const guard = createRouteGuard(adapter);
    const decision = guard.canAccess({
      path: '/dashboard',
      requiresAuth: true,
      redirectTo: '/login',
    });

    // Then access is denied
    assert.equal(decision.allowed, false);

    // And the reason is "auth.guard.not_authenticated"
    assert.equal(decision.reason, 'auth.guard.not_authenticated');
  });
});
