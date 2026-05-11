/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the auth port contract and the simpler auth adapters — anonymous, local-password, and oauth-stub — through unit tests using only the public API.
 * @sidecar auth.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the auth module — port + simple adapters.
 * JWT adapter tests live in auth-jwt.test.mjs; route guard,
 * authenticated client, and server-session adapter tests live in
 * auth-route-guard.test.mjs; OAuth provider adapters and PKCE
 * domain tests live in auth-oauth.test.mjs.
 *
 * SpecRefs: TPL-063; TPL-064; TPL-065; TPL-066; TPL-067; TPL-070; TPL-218
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAuthPort,
  createAnonymousAdapter,
  createLocalPasswordAdapter,
  createOAuthStubAdapter,
} from '../../modules/auth/public-api.mjs';

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('assertAuthPort', () => {
  test('rejects null', () => {
    assert.throws(() => assertAuthPort(null), /non-null object/);
  });

  test('rejects non-object', () => {
    assert.throws(() => assertAuthPort('string'), /non-null object/);
  });

  test('rejects incomplete adapter (missing method)', () => {
    assert.throws(() => assertAuthPort({ login() {}, logout() {} }), /must implement/);
  });

  test('accepts a valid adapter', () => {
    const adapter = {
      login() {},
      logout() {},
      getUser() {},
      isAuthenticated() {},
      onAuthChange() {},
      offAuthChange() {},
    };
    assert.doesNotThrow(() => assertAuthPort(adapter));
  });
});

// ---------------------------------------------------------------------------
// Anonymous adapter
// ---------------------------------------------------------------------------

describe('createAnonymousAdapter', () => {
  test('passes port assertion', () => {
    const adapter = createAnonymousAdapter();
    assert.doesNotThrow(() => assertAuthPort(adapter));
  });

  test('getUser returns anonymous user', () => {
    const adapter = createAnonymousAdapter();
    const user = adapter.getUser();
    assert.equal(user.id, 'anonymous');
    assert.equal(user.displayName, 'Anonymous');
    assert.equal(user.role, 'guest');
  });

  test('isAuthenticated always returns true', () => {
    const adapter = createAnonymousAdapter();
    assert.equal(adapter.isAuthenticated(), true);
  });

  test('login returns success with anonymous user', async () => {
    const adapter = createAnonymousAdapter();
    const result = await adapter.login();
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'anonymous');
  });

  test('logout does not change state', async () => {
    const adapter = createAnonymousAdapter();
    await adapter.logout();
    assert.equal(adapter.isAuthenticated(), true);
    assert.equal(adapter.getUser().id, 'anonymous');
  });

  test('logout does not fire auth-change listeners', async () => {
    const adapter = createAnonymousAdapter();
    let called = false;
    adapter.onAuthChange(() => {
      called = true;
    });
    await adapter.logout();
    assert.equal(called, false);
  });

  test('separate factory calls are independent', () => {
    const a = createAnonymousAdapter();
    const b = createAnonymousAdapter();
    assert.notStrictEqual(a, b);
  });
});

// ---------------------------------------------------------------------------
// Local password adapter
// ---------------------------------------------------------------------------

describe('createLocalPasswordAdapter', () => {
  /** @type {{ load: () => any, save: (d: any) => void }} */
  let storage;
  let data;

  beforeEach(() => {
    data = null;
    storage = {
      load() {
        return data;
      },
      save(d) {
        data = d;
      },
    };
  });

  test('passes port assertion', () => {
    const adapter = createLocalPasswordAdapter(storage);
    assert.doesNotThrow(() => assertAuthPort(adapter));
  });

  test('starts not authenticated', () => {
    const adapter = createLocalPasswordAdapter(storage);
    assert.equal(adapter.isAuthenticated(), false);
    assert.equal(adapter.getUser(), null);
  });

  test('register stores a user', () => {
    const adapter = createLocalPasswordAdapter(storage);
    const result = adapter.register('alice', 'pass123');
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'alice');
  });

  test('register rejects duplicate username', () => {
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('alice', 'pass123');
    const result = adapter.register('alice', 'pass456');
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.register.user_exists');
  });

  test('register rejects empty fields', () => {
    const adapter = createLocalPasswordAdapter(storage);
    const result = adapter.register('', '');
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.register.missing_fields');
  });

  test('login succeeds with correct credentials', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('bob', 'secret');
    const result = await adapter.login({ username: 'bob', password: 'secret' });
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'bob');
    assert.equal(adapter.isAuthenticated(), true);
  });

  test('login fails with wrong password', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('bob', 'secret');
    const result = await adapter.login({ username: 'bob', password: 'wrong' });
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.login.invalid_credentials');
  });

  test('login fails with unknown user', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    const result = await adapter.login({ username: 'nobody', password: 'x' });
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.login.invalid_credentials');
  });

  test('login fails with missing credentials', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    const result = await adapter.login();
    assert.equal(result.success, false);
    assert.equal(result.error, 'auth.login.missing_credentials');
  });

  test('login fires auth-change listener with type login', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('carol', 'pw');

    /** @type {any} */
    let event = null;
    adapter.onAuthChange((e) => {
      event = e;
    });

    await adapter.login({ username: 'carol', password: 'pw' });
    assert.notEqual(event, null);
    assert.equal(event.type, 'login');
    assert.equal(event.user.id, 'carol');
  });

  test('logout clears user and fires auth-change', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('dave', 'pw');
    await adapter.login({ username: 'dave', password: 'pw' });

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
    assert.equal(event.user, null);
  });

  test('offAuthChange removes listener', async () => {
    const adapter = createLocalPasswordAdapter(storage);
    adapter.register('eve', 'pw');

    let count = 0;
    const listener = () => {
      count++;
    };
    adapter.onAuthChange(listener);
    adapter.offAuthChange(listener);

    await adapter.login({ username: 'eve', password: 'pw' });
    assert.equal(count, 0);
  });

  test('degrades gracefully when storage throws', () => {
    const brokenStorage = {
      load() {
        throw new Error('broken');
      },
      save() {
        throw new Error('broken');
      },
    };
    const adapter = createLocalPasswordAdapter(brokenStorage);
    const result = adapter.register('test', 'pw');
    assert.equal(result.success, true);
  });
});

// ---------------------------------------------------------------------------
// OAuth stub adapter
// ---------------------------------------------------------------------------

describe('createOAuthStubAdapter', () => {
  test('passes port assertion', () => {
    const adapter = createOAuthStubAdapter({ providerName: 'github' });
    assert.doesNotThrow(() => assertAuthPort(adapter));
  });

  test('starts not authenticated', () => {
    const adapter = createOAuthStubAdapter({ providerName: 'google' });
    assert.equal(adapter.isAuthenticated(), false);
    assert.equal(adapter.getUser(), null);
  });

  test('login returns mock user with tokens', async () => {
    const adapter = createOAuthStubAdapter({ providerName: 'github' });
    const result = await adapter.login();
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'github_user_1');
    assert.equal(result.user.displayName, 'github User');
    assert.ok(result.user.accessToken);
    assert.ok(result.user.refreshToken);
  });

  test('login uses custom mock user when provided', async () => {
    const mockUser = { id: 'custom_1', displayName: 'Custom', role: 'admin' };
    const adapter = createOAuthStubAdapter({ providerName: 'custom', mockUser });
    const result = await adapter.login();
    assert.equal(result.user.id, 'custom_1');
    assert.equal(result.user.displayName, 'Custom');
    assert.equal(result.user.role, 'admin');
    assert.ok(result.user.accessToken);
  });

  test('login respects mock delay', async () => {
    const adapter = createOAuthStubAdapter({ providerName: 'slow', mockDelay: 50 });
    const start = Date.now();
    await adapter.login();
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `Expected >= 40ms delay, got ${elapsed}ms`);
  });

  test('login fires auth-change listener', async () => {
    const adapter = createOAuthStubAdapter({ providerName: 'test' });
    /** @type {any} */
    let event = null;
    adapter.onAuthChange((e) => {
      event = e;
    });

    await adapter.login();
    assert.notEqual(event, null);
    assert.equal(event.type, 'login');
  });

  test('logout clears session and fires auth-change', async () => {
    const adapter = createOAuthStubAdapter({ providerName: 'test' });
    await adapter.login();

    /** @type {any} */
    let event = null;
    adapter.onAuthChange((e) => {
      event = e;
    });

    await adapter.logout();
    assert.equal(adapter.isAuthenticated(), false);
    assert.equal(event.type, 'logout');
  });

  test('separate factory calls are independent', async () => {
    const a = createOAuthStubAdapter({ providerName: 'a' });
    const b = createOAuthStubAdapter({ providerName: 'b' });
    await a.login();
    assert.equal(a.isAuthenticated(), true);
    assert.equal(b.isAuthenticated(), false);
  });
});
