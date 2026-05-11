/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a production-grade JWT AuthPort adapter that decodes, verifies, and manages access/refresh token lifecycles.
 * @sidecar jwt-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * JWT-based auth adapter. Verifies tokens with jose, extracts user claims,
 * and manages token refresh lifecycle.
 *
 * SpecRefs: TPL-135
 *
 * @typedef {Object} JwtAdapterConfig
 * @property {(credentials?: import('../ports/auth-port.mjs').AuthCredentials) => Promise<{ accessToken: string, refreshToken?: string }>} loginFn
 *   Async function that authenticates credentials and returns signed tokens.
 * @property {(refreshToken: string) => Promise<{ accessToken: string, refreshToken?: string }>} [refreshFn]
 *   Async function that exchanges a refresh token for new tokens.
 * @property {import('jose').KeyLike | Uint8Array} verifyKey
 *   Key used to verify access token signatures (public key or symmetric secret).
 * @property {string} [issuer] - Expected `iss` claim.
 * @property {string} [audience] - Expected `aud` claim.
 * @property {string[]} [algorithms] - Allowed algorithms (default: ['ES256', 'RS256', 'HS256']).
 * @property {number} [refreshBeforeExpirySec] - Seconds before expiry to trigger auto-refresh (default: 60).
 * @property {(claims: import('jose').JWTPayload) => import('../ports/auth-port.mjs').AuthUser} [mapClaims]
 *   Custom function to map JWT claims to AuthUser. Defaults to standard sub/name/role mapping.
 *
 * @param {JwtAdapterConfig} config
 * @returns {import('../ports/auth-port.mjs').AuthPort & { destroy: () => void }}
 */

import { jwtVerify } from 'jose';
import { createAuthState } from '../domain/auth-state.mjs';

/**
 * Default claim-to-user mapper.
 * @param {import('jose').JWTPayload} claims
 * @returns {import('../ports/auth-port.mjs').AuthUser}
 */
function defaultMapClaims(claims) {
  return {
    id: String(claims.sub || 'unknown'),
    displayName: String(claims.name || claims.sub || 'Unknown'),
    role: String(claims.role || 'user'),
  };
}

/**
 * @param {JwtAdapterConfig} config
 */
export function createJwtAdapter(config) {
  const state = createAuthState();
  const algorithms = config.algorithms || ['ES256', 'RS256', 'HS256'];
  const refreshBeforeSec = config.refreshBeforeExpirySec ?? 60;
  const mapClaims = config.mapClaims || defaultMapClaims;

  /** @type {string | null} */
  let _currentAccessToken = null;
  /** @type {string | null} */
  let currentRefreshToken = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let refreshTimer = null;

  function clearRefreshTimer() {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * Verify and decode an access token.
   * @param {string} token
   * @returns {Promise<import('jose').JWTPayload>}
   */
  async function verifyToken(token) {
    /** @type {import('jose').JWTVerifyOptions} */
    const options = { algorithms };
    if (config.issuer) options.issuer = config.issuer;
    if (config.audience) options.audience = config.audience;

    const { payload } = await jwtVerify(token, config.verifyKey, options);
    return payload;
  }

  /**
   * Schedule an automatic token refresh before expiry.
   * @param {import('jose').JWTPayload} claims
   */
  function scheduleRefresh(claims) {
    clearRefreshTimer();
    if (!config.refreshFn || !currentRefreshToken || !claims.exp) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const delaySec = claims.exp - nowSec - refreshBeforeSec;
    if (delaySec <= 0) return; // already too late, will fail on next use

    refreshTimer = setTimeout(async () => {
      try {
        await doRefresh();
      } catch {
        // refresh failed — force logout
        await doLogout();
      }
    }, delaySec * 1000);
  }

  /**
   * Process new tokens: verify, extract user, update state, schedule refresh.
   * @param {{ accessToken: string, refreshToken?: string }} tokens
   */
  async function processTokens(tokens) {
    const claims = await verifyToken(tokens.accessToken);
    const user = mapClaims(claims);
    user.accessToken = tokens.accessToken;
    if (tokens.refreshToken) {
      user.refreshToken = tokens.refreshToken;
    }

    _currentAccessToken = tokens.accessToken;
    currentRefreshToken = tokens.refreshToken || currentRefreshToken;
    state.setUser(user);
    scheduleRefresh(claims);
  }

  async function doRefresh() {
    if (!config.refreshFn || !currentRefreshToken) {
      throw new Error('auth.jwt.refresh_unavailable');
    }
    const tokens = await config.refreshFn(currentRefreshToken);
    await processTokens(tokens);
    state.notifyChange('login'); // re-emit with fresh token
  }

  async function doLogout() {
    clearRefreshTimer();
    _currentAccessToken = null;
    currentRefreshToken = null;
    state.setUser(null);
    state.notifyChange('logout');
  }

  return {
    /** @param {import('../ports/auth-port.mjs').AuthCredentials} [credentials] */
    async login(credentials) {
      try {
        const tokens = await config.loginFn(credentials);
        await processTokens(tokens);
        state.notifyChange('login');
        return {
          success: true,
          user: /** @type {import('../ports/auth-port.mjs').AuthUser} */ (state.getUser()),
        };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error && err.message.startsWith('auth.')
              ? err.message
              : 'auth.jwt.verification_failed',
        };
      }
    },

    async logout() {
      await doLogout();
    },

    getUser() {
      return state.getUser();
    },

    isAuthenticated() {
      return state.isAuthenticated();
    },

    onAuthChange: state.onAuthChange,
    offAuthChange: state.offAuthChange,

    /** Clean up refresh timer. Call when the adapter is no longer needed. */
    destroy() {
      clearRefreshTimer();
    },
  };
}
