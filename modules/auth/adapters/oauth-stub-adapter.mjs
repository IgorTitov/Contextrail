/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a mock OAuth AuthPort adapter with a configurable provider name and simulated delay, for integration testing without a real OAuth provider.
 * @sidecar oauth-stub-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Mock OAuth adapter. Simulates an OAuth flow with configurable provider
 * and mock tokens. For integration testing only — does not perform real OAuth.
 *
 * SpecRefs: TPL-066
 *
 * @typedef {Object} OAuthStubConfig
 * @property {string} providerName
 * @property {number} [mockDelay] - Simulated delay in ms (default 0)
 * @property {import('../ports/auth-port.mjs').AuthUser} [mockUser]
 *
 * @param {OAuthStubConfig} config
 * @returns {import('../ports/auth-port.mjs').AuthPort}
 */

import { createAuthState } from '../domain/auth-state.mjs';

/**
 * @param {OAuthStubConfig} config
 */
export function createOAuthStubAdapter(config) {
  const state = createAuthState();
  const delay = config.mockDelay || 0;

  /** @returns {import('../ports/auth-port.mjs').AuthUser} */
  function buildMockUser() {
    if (config.mockUser) {
      return {
        ...config.mockUser,
        accessToken: config.mockUser.accessToken || `mock_access_${config.providerName}`,
        refreshToken: config.mockUser.refreshToken || `mock_refresh_${config.providerName}`,
      };
    }
    return {
      id: `${config.providerName}_user_1`,
      displayName: `${config.providerName} User`,
      role: 'user',
      accessToken: `mock_access_${config.providerName}`,
      refreshToken: `mock_refresh_${config.providerName}`,
    };
  }

  return {
    /** @param {import('../ports/auth-port.mjs').AuthCredentials} [_credentials] */
    async login(_credentials) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const user = buildMockUser();
      state.setUser(user);
      state.notifyChange('login');
      return { success: true, user };
    },

    async logout() {
      state.setUser(null);
      state.notifyChange('logout');
    },

    getUser() {
      return state.getUser();
    },

    isAuthenticated() {
      return state.isAuthenticated();
    },

    onAuthChange: state.onAuthChange,
    offAuthChange: state.offAuthChange,
  };
}
