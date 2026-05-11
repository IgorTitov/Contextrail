/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Google OAuth 2.0 provider adapter — real authorize URL, token exchange, and userinfo fetch behind OAuthProviderPort.
 * @sidecar google-oauth-provider.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

import { buildAuthorizeUrl, toAuthUserFromGoogle } from '../domain/oauth-flow.mjs';
import { t } from '../messages.mjs';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const DEFAULT_SCOPE = ['openid', 'email', 'profile'];

/**
 * Create a Google OAuth 2.0 provider adapter.
 *
 * `fetchImpl` is injected so tests can stub the network and the domain
 * never touches `globalThis.fetch` directly.
 *
 * @typedef {object} GoogleOAuthConfig
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {string[]} [defaultScope]
 * @property {typeof fetch} [fetchImpl]
 * @property {string} [authorizationEndpoint]
 * @property {string} [tokenEndpoint]
 * @property {string} [userInfoEndpoint]
 *
 * @param {GoogleOAuthConfig} config
 * @returns {import('../ports/oauth-provider-port.mjs').OAuthProviderPort}
 */
export function createGoogleOAuthProvider(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError(t('auth.oauth.config.invalid'));
  }
  if (typeof config.clientId !== 'string' || config.clientId.length === 0) {
    throw new TypeError(t('auth.oauth.config.missing_client_id'));
  }
  if (typeof config.clientSecret !== 'string' || config.clientSecret.length === 0) {
    throw new TypeError(t('auth.oauth.config.missing_client_secret'));
  }
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError(t('auth.oauth.config.missing_fetch'));
  }
  const authorizationEndpoint = config.authorizationEndpoint ?? GOOGLE_AUTHORIZATION_ENDPOINT;
  const tokenEndpoint = config.tokenEndpoint ?? GOOGLE_TOKEN_ENDPOINT;
  const userInfoEndpoint = config.userInfoEndpoint ?? GOOGLE_USERINFO_ENDPOINT;
  const defaultScope = config.defaultScope ?? DEFAULT_SCOPE;

  return {
    providerName: 'google',

    buildAuthorizationUrl(params) {
      return buildAuthorizeUrl({
        endpoint: authorizationEndpoint,
        clientId: config.clientId,
        redirectUri: params.redirectUri,
        state: params.state,
        codeChallenge: params.codeChallenge,
        scope: params.scope ?? defaultScope,
        extraParams: { access_type: 'offline', prompt: 'consent' },
      });
    },

    async exchangeCode(params) {
      if (!params || typeof params !== 'object') {
        throw new TypeError(t('auth.oauth.exchange.invalid_params'));
      }
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: params.code,
        code_verifier: params.codeVerifier,
        redirect_uri: params.redirectUri,
      });
      const response = await fetchImpl(tokenEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: body.toString(),
      });
      if (!response.ok) {
        throw new Error(t('auth.oauth.exchange.failed'));
      }
      const payload = /** @type {Record<string, unknown>} */ (await response.json());
      if (typeof payload.access_token !== 'string' || payload.access_token.length === 0) {
        throw new Error(t('auth.oauth.exchange.failed'));
      }
      return {
        accessToken: payload.access_token,
        refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
        tokenType: typeof payload.token_type === 'string' ? payload.token_type : 'Bearer',
        expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
        scope: typeof payload.scope === 'string' ? payload.scope : undefined,
      };
    },

    async fetchUserInfo(tokens) {
      if (!tokens || typeof tokens !== 'object' || typeof tokens.accessToken !== 'string') {
        throw new TypeError(t('auth.oauth.userinfo.invalid_tokens'));
      }
      const response = await fetchImpl(userInfoEndpoint, {
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
          accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(t('auth.oauth.userinfo.failed'));
      }
      const profile = /** @type {Record<string, unknown>} */ (await response.json());
      return toAuthUserFromGoogle(profile, tokens);
    },
  };
}
