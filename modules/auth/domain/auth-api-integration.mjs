/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Wrap an ApiClientPort to automatically inject Authorization headers from the current auth token, bridging the auth and api-client modules.
 * @sidecar auth-api-integration.mjs.header.md
 * @layer module | @hex domain | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Integration utility that wraps an ApiClientPort to automatically inject
 * Authorization headers from the current auth state.
 *
 * SpecRefs: TPL-070
 *
 * @param {import('../ports/auth-port.mjs').AuthPort} authAdapter
 * @param {import('../../api-client/ports/api-client-port.mjs').ApiClientPort} apiClient
 * @returns {import('../../api-client/ports/api-client-port.mjs').ApiClientPort & { destroy: () => void }}
 */
export function createAuthenticatedClient(authAdapter, apiClient) {
  /** Update Authorization header based on current user */
  function syncAuthHeader() {
    const user = authAdapter.getUser();
    if (user && user.accessToken) {
      apiClient.setHeader('Authorization', `Bearer ${user.accessToken}`);
    } else {
      apiClient.removeHeader('Authorization');
    }
  }

  /** @param {import('../ports/auth-port.mjs').AuthChangeEvent} _event */
  function onAuthChanged(_event) {
    syncAuthHeader();
  }

  // Subscribe to auth changes
  authAdapter.onAuthChange(onAuthChanged);

  // Sync initial state
  syncAuthHeader();

  return {
    get: (url, options) => apiClient.get(url, options),
    post: (url, body, options) => apiClient.post(url, body, options),
    put: (url, body, options) => apiClient.put(url, body, options),
    delete: (url, options) => apiClient.delete(url, options),
    setBaseUrl: (url) => apiClient.setBaseUrl(url),
    setHeader: (name, value) => apiClient.setHeader(name, value),
    removeHeader: (name) => apiClient.removeHeader(name),

    /** Unsubscribe from auth-change events. */
    destroy() {
      authAdapter.offAuthChange(onAuthChanged);
    },
  };
}
