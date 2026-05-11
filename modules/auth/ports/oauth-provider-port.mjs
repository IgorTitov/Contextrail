/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose OAuthProviderPort contract for provider adapters (Google, GitHub, memory).
 * @sidecar oauth-provider-port.mjs.header.md
 * @layer module | @hex port | @ctx auth
 * @public true
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for OAuth 2.0 provider adapters.
 *
 * Real OAuth is a three-step dance: the app builds an authorization URL,
 * the user approves at the provider, the provider redirects back with a
 * code which the app exchanges for tokens and then fetches the user
 * profile. This port exposes the three steps so callers can reach any
 * provider behind the same seam. Concrete adapters wire the real HTTP
 * endpoints; a memory adapter enables deterministic tests.
 *
 * SpecRefs: TPL-001
 *
 * @typedef {import('./auth-port.mjs').AuthUser} AuthUser
 *
 * @typedef {object} OAuthAuthorizeParams
 * @property {string} redirectUri
 * @property {string} state
 * @property {string} codeChallenge
 * @property {string[]} [scope]
 *
 * @typedef {object} OAuthExchangeParams
 * @property {string} code
 * @property {string} codeVerifier
 * @property {string} redirectUri
 *
 * @typedef {object} OAuthTokenBundle
 * @property {string} accessToken
 * @property {string} [refreshToken]
 * @property {string} [tokenType]
 * @property {number} [expiresIn]
 * @property {string} [scope]
 *
 * Adapters also expose a `providerName: string` field (validated at
 * runtime by `assertOAuthProviderPort`) so callers can identify the
 * provider in logs without an extra lookup; it is documented here
 * rather than in the typedef because the capabilities-sync parser
 * classifies typedefs with mixed data fields and methods as records.
 *
 * @typedef {object} OAuthProviderPort
 * @property {(params: OAuthAuthorizeParams) => string} buildAuthorizationUrl
 * @property {(params: OAuthExchangeParams) => Promise<OAuthTokenBundle>} exchangeCode
 * @property {(tokens: OAuthTokenBundle) => Promise<AuthUser>} fetchUserInfo
 */

const REQUIRED_METHODS = [
  ['buildAuthorizationUrl', 'auth.oauth.port.missing_build_authorization_url'],
  ['exchangeCode', 'auth.oauth.port.missing_exchange_code'],
  ['fetchUserInfo', 'auth.oauth.port.missing_fetch_user_info'],
];

/**
 * Validate that an adapter conforms to the OAuthProviderPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertOAuthProviderPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('auth.oauth.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  if (typeof a.providerName !== 'string' || a.providerName.length === 0) {
    throw new TypeError(t('auth.oauth.port.missing_provider_name'));
  }
  for (const [method, key] of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
