/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure OAuth 2.0 flow primitives — PKCE pair, state, authorization URL builder, provider profile mappers.
 * @sidecar oauth-flow.mjs.header.md
 * @layer module | @hex domain | @ctx auth
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure OAuth 2.0 domain primitives. All randomness and hashing is
 * injected so unit tests are deterministic and the domain stays free
 * of `node:crypto` or global `fetch`. Adapters inject real primitives.
 *
 * @typedef {(size: number) => Uint8Array} RandomBytesFn
 * @typedef {(input: Uint8Array) => Uint8Array} Sha256Fn
 * @typedef {{ codeVerifier: string, codeChallenge: string, codeChallengeMethod: 'S256' }} PkcePair
 * @typedef {{ endpoint: string, clientId: string, redirectUri: string, state: string, codeChallenge: string, scope?: string[], extraParams?: Record<string, string> }} AuthorizeUrlInput
 */

/** RFC 7636 base64url without padding. @param {Uint8Array} bytes @returns {string} */
export function base64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a PKCE (verifier, S256 challenge) pair — 32 random bytes → 43 base64url chars. @param {RandomBytesFn} randomBytes @param {Sha256Fn} sha256 @returns {PkcePair} */
export function generatePkcePair(randomBytes, sha256) {
  if (typeof randomBytes !== 'function' || typeof sha256 !== 'function') {
    throw new TypeError(t('auth.oauth.flow.invalid_primitives'));
  }
  const verifierBytes = randomBytes(32);
  const codeVerifier = base64url(verifierBytes);
  const verifierAscii = new Uint8Array(codeVerifier.length);
  for (let i = 0; i < codeVerifier.length; i += 1) {
    verifierAscii[i] = codeVerifier.charCodeAt(i);
  }
  const challengeBytes = sha256(verifierAscii);
  const codeChallenge = base64url(challengeBytes);
  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' };
}

/** Opaque OAuth `state` parameter — 16 bytes → 22 base64url chars. @param {RandomBytesFn} randomBytes @returns {string} */
export function generateOAuthState(randomBytes) {
  if (typeof randomBytes !== 'function') {
    throw new TypeError(t('auth.oauth.flow.invalid_primitives'));
  }
  return base64url(randomBytes(16));
}

/** Build an RFC 6749 authorize URL with PKCE parameters. @param {AuthorizeUrlInput} input @returns {string} */
export function buildAuthorizeUrl(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('auth.oauth.flow.invalid_authorize_input'));
  }
  const { endpoint, clientId, redirectUri, state, codeChallenge, scope, extraParams } = input;
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new TypeError(t('auth.oauth.flow.invalid_endpoint'));
  }
  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new TypeError(t('auth.oauth.flow.invalid_client_id'));
  }
  if (typeof redirectUri !== 'string' || redirectUri.length === 0) {
    throw new TypeError(t('auth.oauth.flow.invalid_redirect_uri'));
  }
  if (typeof state !== 'string' || state.length === 0) {
    throw new TypeError(t('auth.oauth.flow.invalid_state'));
  }
  if (typeof codeChallenge !== 'string' || codeChallenge.length === 0) {
    throw new TypeError(t('auth.oauth.flow.invalid_code_challenge'));
  }
  const url = new URL(endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (Array.isArray(scope) && scope.length > 0) {
    url.searchParams.set('scope', scope.join(' '));
  }
  if (extraParams && typeof extraParams === 'object') {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Map a Google `/userinfo` response onto AuthUser. @param {Record<string, unknown>} profile @param {import('../ports/oauth-provider-port.mjs').OAuthTokenBundle} tokens @returns {import('../ports/auth-port.mjs').AuthUser} */
export function toAuthUserFromGoogle(profile, tokens) {
  if (!profile || typeof profile !== 'object') {
    throw new TypeError(t('auth.oauth.flow.invalid_profile'));
  }
  const sub = profile.sub ?? profile.id;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new TypeError(t('auth.oauth.flow.invalid_profile'));
  }
  const displayName =
    (typeof profile.name === 'string' && profile.name) ||
    (typeof profile.email === 'string' && profile.email) ||
    `google:${sub}`;
  return {
    id: `google:${sub}`,
    displayName,
    role: 'user',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/** Map a GitHub `/user` response onto AuthUser. @param {Record<string, unknown>} profile @param {import('../ports/oauth-provider-port.mjs').OAuthTokenBundle} tokens @returns {import('../ports/auth-port.mjs').AuthUser} */
export function toAuthUserFromGithub(profile, tokens) {
  if (!profile || typeof profile !== 'object') {
    throw new TypeError(t('auth.oauth.flow.invalid_profile'));
  }
  const id = profile.id ?? profile.node_id;
  if (id == null) {
    throw new TypeError(t('auth.oauth.flow.invalid_profile'));
  }
  const displayName =
    (typeof profile.name === 'string' && profile.name) ||
    (typeof profile.login === 'string' && profile.login) ||
    `github:${id}`;
  return {
    id: `github:${id}`,
    displayName,
    role: 'user',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
