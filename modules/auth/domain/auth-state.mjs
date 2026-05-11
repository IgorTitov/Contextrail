/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Manage the shared in-memory auth state (current user and change listeners) used internally by all auth adapters.
 * @sidecar auth-state.mjs.header.md
 * @layer module | @hex domain | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for authentication state management.
 * Framework-free, no external dependencies.
 * Manages current user and auth-change listener notifications.
 *
 * SpecRefs: TPL-063
 */

/**
 * Create an auth state manager.
 *
 * @returns {{
 *   getUser: () => import('../ports/auth-port.mjs').AuthUser | null,
 *   setUser: (user: import('../ports/auth-port.mjs').AuthUser | null) => void,
 *   isAuthenticated: () => boolean,
 *   onAuthChange: (listener: Function) => void,
 *   offAuthChange: (listener: Function) => void,
 *   notifyChange: (type: 'login' | 'logout') => void,
 * }}
 */
export function createAuthState() {
  /** @type {import('../ports/auth-port.mjs').AuthUser | null} */
  let currentUser = null;

  /** @type {Set<Function>} */
  const listeners = new Set();

  return {
    /** @returns {import('../ports/auth-port.mjs').AuthUser | null} */
    getUser() {
      return currentUser;
    },

    /** @param {import('../ports/auth-port.mjs').AuthUser | null} user */
    setUser(user) {
      currentUser = user;
    },

    /** @returns {boolean} */
    isAuthenticated() {
      return currentUser !== null;
    },

    /** @param {Function} listener */
    onAuthChange(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('Auth change listener must be a function');
      }
      listeners.add(listener);
    },

    /** @param {Function} listener */
    offAuthChange(listener) {
      listeners.delete(listener);
    },

    /** @param {'login' | 'logout'} type */
    notifyChange(type) {
      const event = { user: currentUser, type };
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}
