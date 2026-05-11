/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the auth route guard, the authenticated API client wiring, and the server-session adapter using only the public API.
 * @sidecar auth-route-guard.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the auth module — route guard, authenticated API
 * client, and server-session adapter. Port + simple adapters live in
 * auth.test.mjs; JWT adapter lives in auth-jwt.test.mjs; OAuth
 * provider adapters live in auth-oauth.test.mjs.
 *
 * SpecRefs: TPL-218
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAuthPort,
  createAnonymousAdapter,
  createAuthenticatedClient,
  createLocalPasswordAdapter,
  createOAuthStubAdapter,
  createRouteGuard,
  createServerSessionAdapter,
} from '../../modules/auth/public-api.mjs';

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

describe('createRouteGuard', () => {
  test('allows routes that do not require auth', () => {
    const adapter = createAnonymousAdapter();
    const guard = createRouteGuard(adapter);
    const result = guard.canAccess({ path: '/public' });
    assert.equal(result.allowed, true);
  });

  test('allows authenticated users on protected routes', () => {
    const adapter = createAnonymousAdapter();
    const guard = createRouteGuard(adapter);
    const result = guard.canAccess({ path: '/dashboard', requiresAuth: true });
    assert.equal(result.allowed, true);
  });

  test('denies unauthenticated users on protected routes', () => {
    const adapter = createLocalPasswordAdapter({
      load() {
        return null;
      },
      save() {},
    });
    const guard = createRouteGuard(adapter);
    const result = guard.canAccess({
      path: '/dashboard',
      requiresAuth: true,
      redirectTo: '/login',
    });
    assert.equal(result.allowed, false);
    assert.equal(result.redirectTo, '/login');
    assert.equal(result.reason, 'auth.guard.not_authenticated');
  });

  test('denies users without required role', async () => {
    const storage = {
      data: null,
      load() {
        return this.data;
      },
      save(d) {
        this.data = d;
      },
    };
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('user1', 'pw');
    await adapter.login({ username: 'user1', password: 'pw' });

    const guard = createRouteGuard(adapter);
    const result = guard.canAccess({
      path: '/admin',
      requiresAuth: true,
      requiredRoles: ['admin'],
      redirectTo: '/forbidden',
    });
    assert.equal(result.allowed, false);
    assert.equal(result.redirectTo, '/forbidden');
    assert.equal(result.reason, 'auth.guard.insufficient_role');
  });

  test('allows users with matching role', async () => {
    const mockUser = { id: 'admin1', displayName: 'Admin', role: 'admin' };
    const adapter = createOAuthStubAdapter({ providerName: 'test', mockUser });
    await adapter.login();

    const guard = createRouteGuard(adapter);
    const result = guard.canAccess({
      path: '/admin',
      requiresAuth: true,
      requiredRoles: ['admin', 'superadmin'],
    });
    assert.equal(result.allowed, true);
  });
});

// ---------------------------------------------------------------------------
// Auth-API integration
// ---------------------------------------------------------------------------

describe('createAuthenticatedClient', () => {
  /** @returns {import('../../modules/api-client/ports/api-client-port.mjs').ApiClientPort & { _headers: Record<string,string> }} */
  function createMockApiClient() {
    /** @type {Record<string,string>} */
    const headers = {};
    return {
      _headers: headers,
      async get() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      async post() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      async put() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      async delete() {
        return { status: 200, data: null, headers: {}, ok: true };
      },
      setBaseUrl() {},
      setHeader(name, value) {
        headers[name] = value;
      },
      removeHeader(name) {
        delete headers[name];
      },
    };
  }

  test('injects Authorization header when user has token', async () => {
    const mockUser = {
      id: 'u1',
      displayName: 'User',
      role: 'user',
      accessToken: 'tok_123',
    };
    const auth = createOAuthStubAdapter({ providerName: 'test', mockUser });
    await auth.login();

    const api = createMockApiClient();
    const client = createAuthenticatedClient(auth, api);

    assert.equal(api._headers['Authorization'], 'Bearer tok_123');
    client.destroy();
  });

  test('does not inject header when user has no token', () => {
    const auth = createAnonymousAdapter();
    const api = createMockApiClient();
    const client = createAuthenticatedClient(auth, api);

    assert.equal(api._headers['Authorization'], undefined);
    client.destroy();
  });

  test('updates header on auth change (login)', async () => {
    const mockUser = {
      id: 'u1',
      displayName: 'User',
      role: 'user',
      accessToken: 'tok_abc',
    };
    const auth = createOAuthStubAdapter({ providerName: 'test', mockUser });
    const api = createMockApiClient();
    const client = createAuthenticatedClient(auth, api);

    assert.equal(api._headers['Authorization'], undefined);

    await auth.login();
    assert.equal(api._headers['Authorization'], 'Bearer tok_abc');

    client.destroy();
  });

  test('clears header on logout', async () => {
    const mockUser = {
      id: 'u1',
      displayName: 'User',
      role: 'user',
      accessToken: 'tok_xyz',
    };
    const auth = createOAuthStubAdapter({ providerName: 'test', mockUser });
    const api = createMockApiClient();
    const client = createAuthenticatedClient(auth, api);

    await auth.login();
    assert.equal(api._headers['Authorization'], 'Bearer tok_xyz');

    await auth.logout();
    assert.equal(api._headers['Authorization'], undefined);

    client.destroy();
  });

  test('destroy stops listening to auth changes', async () => {
    const mockUser = {
      id: 'u1',
      displayName: 'User',
      role: 'user',
      accessToken: 'tok_cleanup',
    };
    const auth = createOAuthStubAdapter({ providerName: 'test', mockUser });
    const api = createMockApiClient();
    const client = createAuthenticatedClient(auth, api);

    client.destroy();

    await auth.login();
    assert.equal(api._headers['Authorization'], undefined);
  });

  test('delegates all ApiClientPort methods', async () => {
    const auth = createAnonymousAdapter();
    const api = createMockApiClient();
    const client = createAuthenticatedClient(auth, api);

    const getResult = await client.get('/test');
    assert.equal(getResult.ok, true);

    const postResult = await client.post('/test', { a: 1 });
    assert.equal(postResult.ok, true);

    const putResult = await client.put('/test', { a: 2 });
    assert.equal(putResult.ok, true);

    const delResult = await client.delete('/test');
    assert.equal(delResult.ok, true);

    client.setBaseUrl('http://example.com');
    client.setHeader('X-Custom', 'val');
    client.removeHeader('X-Custom');

    client.destroy();
  });
});

// ---------------------------------------------------------------------------
// ServerSessionAdapter
// ---------------------------------------------------------------------------

describe('auth adapter — serverSessionAdapter', () => {
  /** @type {import('../../modules/auth/adapters/server-session-adapter.mjs').CredentialVerifier} */
  let verifier;

  beforeEach(() => {
    verifier = {
      async verify(credentials) {
        if (credentials.username === 'alice' && credentials.password === 'secret') {
          return { id: 'u1', displayName: 'Alice', role: 'admin' };
        }
        return null;
      },
    };
  });

  test('satisfies the port contract', () => {
    const adapter = createServerSessionAdapter({ verifier });
    assert.doesNotThrow(() => assertAuthPort(adapter));
  });

  test('login succeeds with valid credentials', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    const result = await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'u1');
    assert.equal(result.user.displayName, 'Alice');
    assert.equal(typeof result.user.accessToken, 'string');
  });

  test('login fails with invalid credentials', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    const result = await adapter.login({ username: 'alice', password: 'wrong' });
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.login.invalid_credentials');
  });

  test('login fails with missing credentials', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    const result = await adapter.login();
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.login.missing_credentials');
  });

  test('isAuthenticated returns true after login', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    assert.equal(adapter.isAuthenticated(), false);
    await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(adapter.isAuthenticated(), true);
  });

  test('getUser returns user after login', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    assert.equal(adapter.getUser(), null);
    await adapter.login({ username: 'alice', password: 'secret' });
    const user = adapter.getUser();
    assert.equal(user.id, 'u1');
    assert.equal(user.displayName, 'Alice');
  });

  test('logout clears session', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(adapter.isAuthenticated(), true);
    await adapter.logout();
    assert.equal(adapter.isAuthenticated(), false);
    assert.equal(adapter.getUser(), null);
  });

  test('getSessionId returns session after login and null after logout', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    assert.equal(adapter.getSessionId(), null);
    await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(typeof adapter.getSessionId(), 'string');
    await adapter.logout();
    assert.equal(adapter.getSessionId(), null);
  });

  test('onAuthChange fires on login', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    const events = [];
    adapter.onAuthChange((e) => events.push(e));
    await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'login');
    assert.equal(events[0].user.id, 'u1');
  });

  test('onAuthChange fires on logout', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    await adapter.login({ username: 'alice', password: 'secret' });
    const events = [];
    adapter.onAuthChange((e) => events.push(e));
    await adapter.logout();
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'logout');
    assert.equal(events[0].user, null);
  });

  test('offAuthChange unregisters listener', async () => {
    const adapter = createServerSessionAdapter({ verifier });
    const events = [];
    const handler = (e) => events.push(e);
    adapter.onAuthChange(handler);
    adapter.offAuthChange(handler);
    await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(events.length, 0);
  });

  test('works with custom session store', async () => {
    const customStore = new Map();
    const store = {
      get(id) {
        return customStore.get(id);
      },
      set(id, user) {
        customStore.set(id, user);
      },
      delete(id) {
        return customStore.delete(id);
      },
    };
    const adapter = createServerSessionAdapter({ verifier, store });
    await adapter.login({ username: 'alice', password: 'secret' });
    assert.equal(customStore.size, 1);
    await adapter.logout();
    assert.equal(customStore.size, 0);
  });
});
