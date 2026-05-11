/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Define the AuthPort contract that all auth adapters must satisfy, plus the shared AuthUser, AuthCredentials, AuthResult, and AuthChangeEvent types.
 * @sidecar auth-port.mjs.header.md
 * @layer module | @hex port | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Port contract for authentication adapters.
 * Ports define what the domain needs, not how it is provided.
 *
 * SpecRefs: TPL-063
 *
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} displayName
 * @property {string} role
 * @property {string} [accessToken]
 * @property {string} [refreshToken]
 *
 * @typedef {Object} AuthCredentials
 * @property {string} [username]
 * @property {string} [password]
 * @property {string} [provider]
 * @property {string} [token]
 *
 * @typedef {Object} AuthResult
 * @property {boolean} success
 * @property {AuthUser} [user]
 * @property {string} [error] - i18n message key
 *
 * @typedef {Object} AuthChangeEvent
 * @property {AuthUser | null} user
 * @property {'login' | 'logout'} type
 *
 * @typedef {Object} AuthPort
 * @property {(credentials?: AuthCredentials) => Promise<AuthResult>} login
 * @property {() => Promise<void>} logout
 * @property {() => AuthUser | null} getUser
 * @property {() => boolean} isAuthenticated
 * @property {(listener: (event: AuthChangeEvent) => void) => void} onAuthChange
 * @property {(listener: (event: AuthChangeEvent) => void) => void} offAuthChange
 */

const REQUIRED_METHODS = [
  'login',
  'logout',
  'getUser',
  'isAuthenticated',
  'onAuthChange',
  'offAuthChange',
];

/**
 * Validate that an adapter conforms to the AuthPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertAuthPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('AuthPort adapter must be a non-null object');
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(`AuthPort adapter must implement ${method}()`);
    }
  }
}
