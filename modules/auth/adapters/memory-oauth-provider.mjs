/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory OAuthProviderPort adapter for deterministic tests and api-starter demos.
 * @sidecar memory-oauth-provider.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

import { buildAuthorizeUrl } from '../domain/oauth-flow.mjs';
import { t } from '../messages.mjs';

/**
 * Memory OAuth provider. Records every call and returns preconfigured
 * tokens/profile so integration tests can exercise the full start →
 * callback flow without touching the network.
 *
 * @typedef {object} MemoryOAuthConfig
 * @property {string} [providerName]
 * @property {string} [clientId]
 * @property {string} [authorizationEndpoint]
 * @property {string[]} [defaultScope]
 * @property {(params: import('../ports/oauth-provider-port.mjs').OAuthExchangeParams) =>
 *     import('../ports/oauth-provider-port.mjs').OAuthTokenBundle} [exchangeHandler]
 * @property {(tokens: import('../ports/oauth-provider-port.mjs').OAuthTokenBundle) =>
 *     import('../ports/auth-port.mjs').AuthUser} [userInfoHandler]
 *
 * @param {MemoryOAuthConfig} [config]
 * @returns {import('../ports/oauth-provider-port.mjs').OAuthProviderPort & {
 *   authorizeCalls: () => Array<import('../ports/oauth-provider-port.mjs').OAuthAuthorizeParams>,
 *   exchangeCalls: () => Array<import('../ports/oauth-provider-port.mjs').OAuthExchangeParams>,
 *   clear: () => void,
 * }}
 */
export function createMemoryOAuthProvider(config = {}) {
  const providerName = config.providerName ?? 'memory';
  const clientId = config.clientId ?? 'memory-client-id';
  const authorizationEndpoint =
    config.authorizationEndpoint ?? 'https://memory.example/oauth/authorize';
  const defaultScope = config.defaultScope ?? ['openid', 'email'];

  /** @type {Array<import('../ports/oauth-provider-port.mjs').OAuthAuthorizeParams>} */
  const authorizeCalls = [];
  /** @type {Array<import('../ports/oauth-provider-port.mjs').OAuthExchangeParams>} */
  const exchangeCalls = [];

  const exchangeHandler =
    config.exchangeHandler ??
    ((/** @type {import('../ports/oauth-provider-port.mjs').OAuthExchangeParams} */ params) => ({
      accessToken: `memory_access_${params.code}`,
      refreshToken: `memory_refresh_${params.code}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
    }));

  const userInfoHandler =
    config.userInfoHandler ??
    ((/** @type {import('../ports/oauth-provider-port.mjs').OAuthTokenBundle} */ tokens) => ({
      id: `${providerName}:user-1`,
      displayName: `${providerName} Test User`,
      role: 'user',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }));

  return {
    providerName,
    buildAuthorizationUrl(params) {
      if (!params || typeof params !== 'object') {
        throw new TypeError(t('auth.oauth.flow.invalid_authorize_input'));
      }
      authorizeCalls.push(params);
      return buildAuthorizeUrl({
        endpoint: authorizationEndpoint,
        clientId,
        redirectUri: params.redirectUri,
        state: params.state,
        codeChallenge: params.codeChallenge,
        scope: params.scope ?? defaultScope,
      });
    },
    async exchangeCode(params) {
      if (!params || typeof params !== 'object') {
        throw new TypeError(t('auth.oauth.exchange.invalid_params'));
      }
      if (typeof params.code !== 'string' || params.code.length === 0) {
        throw new TypeError(t('auth.oauth.exchange.missing_code'));
      }
      exchangeCalls.push(params);
      return exchangeHandler(params);
    },
    async fetchUserInfo(tokens) {
      if (!tokens || typeof tokens !== 'object') {
        throw new TypeError(t('auth.oauth.userinfo.invalid_tokens'));
      }
      return userInfoHandler(tokens);
    },
    authorizeCalls() {
      return authorizeCalls.slice();
    },
    exchangeCalls() {
      return exchangeCalls.slice();
    },
    clear() {
      authorizeCalls.length = 0;
      exchangeCalls.length = 0;
    },
  };
}
