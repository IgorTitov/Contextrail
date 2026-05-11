/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide a demo username/password AuthPort adapter that stores hashed credentials via a StoragePort for local development and testing only.
 * @sidecar local-password-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Local password auth adapter. Demo credential storage via StoragePort.
 * Uses a simple hash for password storage — NOT suitable for production use.
 *
 * SpecRefs: TPL-065
 *
 * @param {{ load: () => any, save: (data: any) => void }} storageAdapter
 * @returns {import('../ports/auth-port.mjs').AuthPort & { register: (username: string, password: string) => import('../ports/auth-port.mjs').AuthResult }}
 */

import { createAuthState } from '../domain/auth-state.mjs';

/**
 * Simple string hash for demo purposes.
 * WARNING: This is NOT cryptographically secure. Do not use in production.
 * Replace with bcrypt, argon2, or similar for real applications.
 *
 * @param {string} str
 * @returns {string}
 */
function demoHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return 'demo_' + Math.abs(hash).toString(36);
}

/**
 * @param {{ load: () => any, save: (data: any) => void }} storageAdapter
 */
export function createLocalPasswordAdapter(storageAdapter) {
  const state = createAuthState();

  /**
   * Load stored users from storage, or return empty object on failure.
   * @returns {Record<string, { id: string, displayName: string, role: string, passwordHash: string }>}
   */
  function loadUsers() {
    try {
      const data = storageAdapter.load();
      return (data && data.users) || {};
    } catch {
      return {};
    }
  }

  /**
   * Save users to storage, swallowing errors for graceful degradation.
   * @param {Record<string, any>} users
   */
  function saveUsers(users) {
    try {
      const data = storageAdapter.load() || {};
      data.users = users;
      storageAdapter.save(data);
    } catch {
      // Degrade gracefully when storage is unavailable
    }
  }

  return {
    /**
     * Register a new user with username and password.
     *
     * @param {string} username
     * @param {string} password
     * @returns {import('../ports/auth-port.mjs').AuthResult}
     */
    register(username, password) {
      if (!username || !password) {
        return { success: false, error: 'auth.register.missing_fields' };
      }

      const users = loadUsers();
      if (users[username]) {
        return { success: false, error: 'auth.register.user_exists' };
      }

      users[username] = {
        id: username,
        displayName: username,
        role: 'user',
        passwordHash: demoHash(password),
      };
      saveUsers(users);

      return {
        success: true,
        user: { id: username, displayName: username, role: 'user' },
      };
    },

    /** @param {import('../ports/auth-port.mjs').AuthCredentials} [credentials] */
    async login(credentials) {
      if (!credentials || !credentials.username || !credentials.password) {
        return { success: false, error: 'auth.login.missing_credentials' };
      }

      const users = loadUsers();
      const stored = users[credentials.username];
      if (!stored) {
        return { success: false, error: 'auth.login.invalid_credentials' };
      }

      if (stored.passwordHash !== demoHash(credentials.password)) {
        return { success: false, error: 'auth.login.invalid_credentials' };
      }

      /** @type {import('../ports/auth-port.mjs').AuthUser} */
      const user = {
        id: stored.id,
        displayName: stored.displayName,
        role: stored.role,
      };

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
