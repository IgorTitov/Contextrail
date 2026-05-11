/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the no-auth default AuthPort adapter that treats every session as an implicitly authenticated anonymous user.
 * @sidecar anonymous-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Anonymous auth adapter. Default for apps that do not need authentication.
 * Always returns an anonymous user and is implicitly authenticated.
 *
 * SpecRefs: TPL-064
 *
 * @returns {import('../ports/auth-port.mjs').AuthPort}
 */

import { createAuthState } from '../domain/auth-state.mjs';

export function createAnonymousAdapter() {
  const state = createAuthState();

  /** @type {import('../ports/auth-port.mjs').AuthUser} */
  const anonymousUser = {
    id: 'anonymous',
    displayName: 'Anonymous',
    role: 'guest',
  };

  // Always set the anonymous user
  state.setUser(anonymousUser);

  return {
    /** @param {import('../ports/auth-port.mjs').AuthCredentials} [_credentials] */
    async login(_credentials) {
      return { success: true, user: anonymousUser };
    },

    async logout() {
      // No-op: anonymous adapter state never changes
    },

    getUser() {
      return anonymousUser;
    },

    isAuthenticated() {
      return true;
    },

    onAuthChange: state.onAuthChange,
    offAuthChange: state.offAuthChange,
  };
}
