/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Server Session adapter for the auth module.
 * @sidecar server-session-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Server-side session auth adapter.
 * Implements AuthPort using an in-memory session store for server environments.
 *
 * Sessions are identified by opaque tokens (crypto.randomUUID). The adapter
 * accepts an optional external session store via driver injection — by default
 * it uses an in-memory Map, but any store implementing `{ get, set, delete }`
 * works (e.g. a Redis-backed store).
 *
 * The credential verifier is also injected — the adapter does not own password
 * hashing or user lookup. This keeps it a pure infrastructure adapter.
 *
 * @typedef {object} SessionStore
 * @property {(id: string) => import('../ports/auth-port.mjs').AuthUser | undefined} get
 * @property {(id: string, user: import('../ports/auth-port.mjs').AuthUser) => void} set
 * @property {(id: string) => boolean} delete
 *
 * @typedef {object} CredentialVerifier
 * @property {(credentials: import('../ports/auth-port.mjs').AuthCredentials) => Promise<import('../ports/auth-port.mjs').AuthUser | null>} verify
 *
 * @typedef {object} ServerSessionOptions
 * @property {CredentialVerifier} verifier — checks credentials and returns user or null
 * @property {SessionStore} [store] — defaults to in-memory Map
 * @property {number} [sessionTtlMs] — optional session TTL in milliseconds
 */

import { createAuthState } from '../domain/auth-state.mjs';

/**
 * Create an in-memory session store (default).
 * @returns {SessionStore}
 */
function createMemorySessionStore() {
  /** @type {Map<string, { user: import('../ports/auth-port.mjs').AuthUser, createdAt: number }>} */
  const sessions = new Map();

  return {
    get(id) {
      const entry = sessions.get(id);
      return entry ? entry.user : undefined;
    },
    set(id, user) {
      sessions.set(id, { user, createdAt: Date.now() });
    },
    delete(id) {
      return sessions.delete(id);
    },
  };
}

/**
 * Generate a session ID.
 * Uses crypto.randomUUID when available, falls back to timestamp-based ID.
 * @returns {string}
 */
function generateSessionId() {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Create a server-side session auth adapter.
 *
 * @param {ServerSessionOptions} options
 * @returns {import('../ports/auth-port.mjs').AuthPort & { getSessionId: () => string | null }}
 */
export function createServerSessionAdapter(options) {
  const { verifier, store = createMemorySessionStore() } = options;
  const state = createAuthState();

  /** @type {string | null} */
  let currentSessionId = null;

  return {
    /** @param {import('../ports/auth-port.mjs').AuthCredentials} [credentials] */
    async login(credentials) {
      if (!credentials) {
        return { success: false, error: 'auth.login.missing_credentials' };
      }

      const user = await verifier.verify(credentials);
      if (!user) {
        return { success: false, error: 'auth.login.invalid_credentials' };
      }

      const sessionId = generateSessionId();
      store.set(sessionId, user);
      currentSessionId = sessionId;

      state.setUser(user);
      state.notifyChange('login');

      return { success: true, user: { ...user, accessToken: sessionId } };
    },

    async logout() {
      if (currentSessionId) {
        store.delete(currentSessionId);
        currentSessionId = null;
      }
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

    /**
     * Expose the current session ID for middleware integration.
     * @returns {string | null}
     */
    getSessionId() {
      return currentSessionId;
    },
  };
}
