/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for OAuth 2.0 flow domain, memory adapter, and provider port assertion.
 * @sidecar auth-oauth.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  base64url,
  generatePkcePair,
  generateOAuthState,
  buildAuthorizeUrl,
  toAuthUserFromGoogle,
  toAuthUserFromGithub,
  assertOAuthProviderPort,
  createMemoryOAuthProvider,
  createGoogleOAuthProvider,
  createGitHubOAuthProvider,
  createNodePkcePair,
  createNodeOAuthState,
} from '../../modules/auth/public-api.mjs';

/**
 * Deterministic pseudo-random source for PKCE/state tests.
 * @param {number} seed
 * @returns {(size: number) => Uint8Array}
 */
function seededRandom(seed) {
  let s = seed;
  return (size) => {
    const out = new Uint8Array(size);
    for (let i = 0; i < size; i += 1) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      out[i] = s & 0xff;
    }
    return out;
  };
}

/** @type {import('../../modules/auth/public-api.mjs').Sha256Fn} */
function realSha256(input) {
  const h = createHash('sha256');
  h.update(input);
  return new Uint8Array(h.digest());
}

describe('oauth-flow domain — base64url', () => {
  test('encodes bytes without padding and url-safe chars', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf, 0x00]);
    const encoded = base64url(bytes);
    assert.ok(!encoded.includes('='));
    assert.ok(!encoded.includes('+'));
    assert.ok(!encoded.includes('/'));
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  });
});

describe('oauth-flow domain — PKCE and state', () => {
  test('generatePkcePair produces a verifier and an S256 challenge', () => {
    const random = seededRandom(42);
    const pair = generatePkcePair(random, realSha256);
    assert.equal(pair.codeChallengeMethod, 'S256');
    assert.ok(pair.codeVerifier.length >= 43 && pair.codeVerifier.length <= 128);
    assert.match(pair.codeVerifier, /^[A-Za-z0-9_-]+$/);
    assert.match(pair.codeChallenge, /^[A-Za-z0-9_-]+$/);
    // Challenge is deterministic given the same verifier.
    const recomputed = base64url(
      realSha256(new Uint8Array([...pair.codeVerifier].map((c) => c.charCodeAt(0)))),
    );
    assert.equal(pair.codeChallenge, recomputed);
  });

  test('generatePkcePair rejects non-function primitives', () => {
    assert.throws(() => generatePkcePair(null, realSha256), /primitives/);
    assert.throws(() => generatePkcePair(seededRandom(1), null), /primitives/);
  });

  test('generateOAuthState returns a non-empty url-safe string', () => {
    const state = generateOAuthState(seededRandom(7));
    assert.ok(state.length > 0);
    assert.match(state, /^[A-Za-z0-9_-]+$/);
  });

  test('createNodePkcePair and createNodeOAuthState use node:crypto', () => {
    const pair = createNodePkcePair();
    assert.equal(pair.codeChallengeMethod, 'S256');
    assert.match(pair.codeVerifier, /^[A-Za-z0-9_-]+$/);
    assert.ok(createNodeOAuthState().length > 0);
  });
});

describe('oauth-flow domain — buildAuthorizeUrl', () => {
  test('builds a well-formed authorize URL with PKCE and scope', () => {
    const url = buildAuthorizeUrl({
      endpoint: 'https://example.com/oauth/authorize',
      clientId: 'client-1',
      redirectUri: 'https://app.example/callback',
      state: 'xyz',
      codeChallenge: 'abc',
      scope: ['openid', 'email'],
      extraParams: { prompt: 'consent' },
    });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('response_type'), 'code');
    assert.equal(parsed.searchParams.get('client_id'), 'client-1');
    assert.equal(parsed.searchParams.get('redirect_uri'), 'https://app.example/callback');
    assert.equal(parsed.searchParams.get('state'), 'xyz');
    assert.equal(parsed.searchParams.get('code_challenge'), 'abc');
    assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(parsed.searchParams.get('scope'), 'openid email');
    assert.equal(parsed.searchParams.get('prompt'), 'consent');
  });

  test('rejects missing fields with i18n error keys', () => {
    assert.throws(() =>
      buildAuthorizeUrl({ clientId: 'c', redirectUri: 'r', state: 's', codeChallenge: 'x' }),
    );
    assert.throws(() =>
      buildAuthorizeUrl({
        endpoint: 'https://e',
        redirectUri: 'r',
        state: 's',
        codeChallenge: 'x',
      }),
    );
    assert.throws(() => buildAuthorizeUrl(null));
  });
});

describe('oauth-flow domain — profile mappers', () => {
  test('toAuthUserFromGoogle maps sub/name/email onto AuthUser', () => {
    const user = toAuthUserFromGoogle(
      { sub: '42', name: 'Alice', email: 'a@example.com' },
      { accessToken: 'tok' },
    );
    assert.equal(user.id, 'google:42');
    assert.equal(user.displayName, 'Alice');
    assert.equal(user.role, 'user');
    assert.equal(user.accessToken, 'tok');
  });

  test('toAuthUserFromGoogle falls back to email then synthetic display name', () => {
    assert.equal(
      toAuthUserFromGoogle({ sub: '7', email: 'b@example.com' }, { accessToken: 't' }).displayName,
      'b@example.com',
    );
    assert.equal(toAuthUserFromGoogle({ sub: '9' }, { accessToken: 't' }).displayName, 'google:9');
  });

  test('toAuthUserFromGithub maps id/login/name onto AuthUser', () => {
    const user = toAuthUserFromGithub(
      { id: 1234, login: 'octocat', name: 'The Octocat' },
      { accessToken: 'tok', refreshToken: 'r' },
    );
    assert.equal(user.id, 'github:1234');
    assert.equal(user.displayName, 'The Octocat');
    assert.equal(user.refreshToken, 'r');
  });

  test('profile mappers reject missing identifiers', () => {
    assert.throws(() => toAuthUserFromGoogle({}, { accessToken: 't' }));
    assert.throws(() => toAuthUserFromGithub({}, { accessToken: 't' }));
  });
});

describe('assertOAuthProviderPort', () => {
  test('accepts a valid memory adapter', () => {
    const provider = createMemoryOAuthProvider();
    assert.doesNotThrow(() => assertOAuthProviderPort(provider));
  });

  test('rejects a non-object adapter', () => {
    assert.throws(() => assertOAuthProviderPort(null));
    assert.throws(() => assertOAuthProviderPort('nope'));
  });

  test('rejects adapters missing providerName', () => {
    assert.throws(() =>
      assertOAuthProviderPort({
        buildAuthorizationUrl() {},
        exchangeCode() {},
        fetchUserInfo() {},
      }),
    );
  });

  test('rejects adapters missing each required method in turn', () => {
    const full = createMemoryOAuthProvider();
    for (const method of ['buildAuthorizationUrl', 'exchangeCode', 'fetchUserInfo']) {
      const broken = { ...full };
      delete broken[method];
      assert.throws(() => assertOAuthProviderPort(broken), new RegExp(method, 'i'));
    }
  });
});

describe('memory OAuth provider adapter', () => {
  test('records authorize calls and emits a buildable URL', () => {
    const provider = createMemoryOAuthProvider({ providerName: 'acme' });
    const url = provider.buildAuthorizationUrl({
      redirectUri: 'https://app/callback',
      state: 's1',
      codeChallenge: 'c1',
    });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('state'), 's1');
    assert.equal(parsed.searchParams.get('code_challenge'), 'c1');
    assert.equal(provider.authorizeCalls().length, 1);
    assert.equal(provider.providerName, 'acme');
  });

  test('exchangeCode records calls and returns default tokens', async () => {
    const provider = createMemoryOAuthProvider();
    const tokens = await provider.exchangeCode({
      code: 'abc',
      codeVerifier: 'v',
      redirectUri: 'r',
    });
    assert.equal(tokens.accessToken, 'memory_access_abc');
    assert.equal(tokens.refreshToken, 'memory_refresh_abc');
    assert.equal(provider.exchangeCalls().length, 1);
  });

  test('exchangeCode validates params', async () => {
    const provider = createMemoryOAuthProvider();
    await assert.rejects(provider.exchangeCode({ code: '', codeVerifier: 'v', redirectUri: 'r' }));
    await assert.rejects(provider.exchangeCode(null));
  });

  test('fetchUserInfo returns a profile with the token injected', async () => {
    const provider = createMemoryOAuthProvider({ providerName: 'acme' });
    const user = await provider.fetchUserInfo({ accessToken: 't-1' });
    assert.equal(user.id, 'acme:user-1');
    assert.equal(user.accessToken, 't-1');
  });

  test('custom handlers override default behavior', async () => {
    const provider = createMemoryOAuthProvider({
      providerName: 'acme',
      exchangeHandler: () => ({ accessToken: 'custom', tokenType: 'Bearer' }),
      userInfoHandler: (tokens) => ({
        id: 'acme:override',
        displayName: 'Override',
        role: 'admin',
        accessToken: tokens.accessToken,
      }),
    });
    const tokens = await provider.exchangeCode({ code: 'x', codeVerifier: 'v', redirectUri: 'r' });
    assert.equal(tokens.accessToken, 'custom');
    const user = await provider.fetchUserInfo(tokens);
    assert.equal(user.role, 'admin');
    assert.equal(user.id, 'acme:override');
  });

  test('clear() drops recorded calls', () => {
    const provider = createMemoryOAuthProvider();
    provider.buildAuthorizationUrl({
      redirectUri: 'r',
      state: 's',
      codeChallenge: 'c',
    });
    provider.clear();
    assert.equal(provider.authorizeCalls().length, 0);
  });
});

describe('Google OAuth provider adapter', () => {
  test('builds an authorize URL with offline access and prompt=consent', () => {
    const provider = createGoogleOAuthProvider({
      clientId: 'g-client',
      clientSecret: 'g-secret',
      fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    });
    const url = provider.buildAuthorizationUrl({
      redirectUri: 'https://app/cb',
      state: 'st',
      codeChallenge: 'ch',
    });
    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(parsed.searchParams.get('client_id'), 'g-client');
    assert.equal(parsed.searchParams.get('access_type'), 'offline');
    assert.equal(parsed.searchParams.get('prompt'), 'consent');
    assert.ok(parsed.searchParams.get('scope').includes('openid'));
  });

  test('exchangeCode POSTs to the token endpoint and maps access_token', async () => {
    /** @type {Array<{url: string, init: RequestInit}>} */
    const calls = [];
    const provider = createGoogleOAuthProvider({
      clientId: 'g',
      clientSecret: 's',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          json: async () => ({
            access_token: 'A',
            refresh_token: 'R',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        };
      },
    });
    const tokens = await provider.exchangeCode({
      code: 'code-1',
      codeVerifier: 'ver',
      redirectUri: 'https://app/cb',
    });
    assert.equal(tokens.accessToken, 'A');
    assert.equal(tokens.refreshToken, 'R');
    assert.equal(tokens.expiresIn, 3600);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
    assert.equal(calls[0].init.method, 'POST');
    assert.ok(calls[0].init.body.includes('code=code-1'));
    assert.ok(calls[0].init.body.includes('code_verifier=ver'));
  });

  test('exchangeCode throws when response is not ok', async () => {
    const provider = createGoogleOAuthProvider({
      clientId: 'g',
      clientSecret: 's',
      fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
    });
    await assert.rejects(
      provider.exchangeCode({ code: 'c', codeVerifier: 'v', redirectUri: 'r' }),
      /exchange failed/i,
    );
  });

  test('fetchUserInfo maps sub + name onto AuthUser', async () => {
    const provider = createGoogleOAuthProvider({
      clientId: 'g',
      clientSecret: 's',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ sub: '1', name: 'Alice', email: 'a@example.com' }),
      }),
    });
    const user = await provider.fetchUserInfo({ accessToken: 'tok' });
    assert.equal(user.id, 'google:1');
    assert.equal(user.displayName, 'Alice');
    assert.equal(user.accessToken, 'tok');
  });

  test('rejects invalid config', () => {
    assert.throws(() => createGoogleOAuthProvider(null));
    assert.throws(() => createGoogleOAuthProvider({ clientSecret: 's' }));
    assert.throws(() => createGoogleOAuthProvider({ clientId: 'g' }));
    assert.throws(() =>
      createGoogleOAuthProvider({ clientId: 'g', clientSecret: 's', fetchImpl: 'x' }),
    );
  });
});

describe('GitHub OAuth provider adapter', () => {
  test('builds an authorize URL using github.com endpoint', () => {
    const provider = createGitHubOAuthProvider({
      clientId: 'gh',
      clientSecret: 's',
      fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    });
    const url = provider.buildAuthorizationUrl({
      redirectUri: 'https://app/cb',
      state: 'st',
      codeChallenge: 'ch',
    });
    assert.ok(url.startsWith('https://github.com/login/oauth/authorize'));
  });

  test('exchangeCode sends user-agent and accept: json', async () => {
    let capturedInit;
    const provider = createGitHubOAuthProvider({
      clientId: 'gh',
      clientSecret: 's',
      fetchImpl: async (_url, init) => {
        capturedInit = init;
        return {
          ok: true,
          json: async () => ({ access_token: 'A', token_type: 'bearer', scope: 'read:user' }),
        };
      },
    });
    const tokens = await provider.exchangeCode({
      code: 'c',
      codeVerifier: 'v',
      redirectUri: 'r',
    });
    assert.equal(tokens.accessToken, 'A');
    assert.equal(tokens.scope, 'read:user');
    assert.equal(capturedInit.headers.accept, 'application/json');
    assert.equal(capturedInit.headers['user-agent'], 'contextrail-auth');
  });

  test('fetchUserInfo maps login when name is missing', async () => {
    const provider = createGitHubOAuthProvider({
      clientId: 'gh',
      clientSecret: 's',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ id: 99, login: 'octo' }),
      }),
    });
    const user = await provider.fetchUserInfo({ accessToken: 'tok' });
    assert.equal(user.id, 'github:99');
    assert.equal(user.displayName, 'octo');
  });
});
