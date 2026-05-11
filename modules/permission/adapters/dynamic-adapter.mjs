/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Dynamic adapter for the permission module.
 * @sidecar dynamic-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Dynamic permission adapter.
 * Delegates permission checks to injected async functions and caches
 * results for synchronous retrieval via the PermissionPort interface.
 *
 * Cache is populated on setUser() via the checkFn, so can()/cannot()
 * always return synchronously from cache. Unknown permissions that have
 * not been prefetched return the defaultEffect.
 *
 * @module
 */

import { t } from '../messages.mjs';

/**
 * @typedef {Object} DynamicAdapterOptions
 * @property {(user: { role: string }, action: string, resource: string) => Promise<boolean>} checkFn
 * @property {((rule: import('../ports/permission-port.mjs').PermissionRule) => Promise<void>) | undefined} [grantFn]
 * @property {((action: string, resource: string, role?: string) => Promise<void>) | undefined} [revokeFn]
 * @property {number} [cacheTtl]
 * @property {'allow' | 'deny'} [defaultEffect]
 */

/**
 * Create a dynamic permission adapter.
 *
 * @param {DynamicAdapterOptions} options
 * @returns {import('../ports/permission-port.mjs').PermissionPort & { prefetch: (action: string, resource: string) => Promise<void>, invalidateCache: () => void, destroy: () => void }}
 */
export function createDynamicPermissionAdapter(options) {
  const { checkFn, grantFn, revokeFn, cacheTtl = 60000, defaultEffect = 'deny' } = options;

  if (typeof checkFn !== 'function') {
    throw new TypeError(t('permission.missing_check_fn'));
  }

  /**
   * Cache entries: key → { value: boolean, expiry: number }
   * @type {Map<string, { value: boolean, expiry: number }>}
   */
  const cache = new Map();

  /** @type {{ role: string } | null} */
  let currentUser = null;

  /**
   * Build a cache key from action, resource, and the current user's role.
   * @param {string} action
   * @param {string} resource
   * @returns {string}
   */
  function cacheKey(action, resource) {
    const userId = currentUser ? currentUser.role : '_none_';
    return `${userId}:${action}:${resource}`;
  }

  /**
   * Read a cached value if it exists and has not expired.
   * @param {string} key
   * @returns {boolean | undefined}
   */
  function readCache(key) {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Write a value into the cache.
   * @param {string} key
   * @param {boolean} value
   */
  function writeCache(key, value) {
    cache.set(key, { value, expiry: Date.now() + cacheTtl });
  }

  function can(action, resource, _conditions) {
    const key = cacheKey(action, resource);
    const cached = readCache(key);
    if (cached !== undefined) return cached;
    return defaultEffect === 'allow';
  }

  return {
    can,

    cannot(action, resource, conditions) {
      return !can(action, resource, conditions);
    },

    grant(rule) {
      if (typeof grantFn !== 'function') {
        throw new Error(t('permission.missing_grant_fn'));
      }
      grantFn(rule);
    },

    revoke(action, resource, role) {
      if (typeof revokeFn !== 'function') {
        throw new Error(t('permission.missing_revoke_fn'));
      }
      revokeFn(action, resource, role);
    },

    getRulesForRole(_role) {
      // Dynamic adapter does not maintain a local rule set;
      // returns empty array. Rules live in the external system.
      return [];
    },

    setUser(user) {
      currentUser = user;
    },

    /**
     * Warm the cache for a specific action/resource pair by calling
     * checkFn and storing the result.
     *
     * @param {string} action
     * @param {string} resource
     * @returns {Promise<void>}
     */
    async prefetch(action, resource) {
      if (!currentUser) return;
      const key = cacheKey(action, resource);
      const result = await checkFn(currentUser, action, resource);
      writeCache(key, result);
    },

    /** Clear all cached permission decisions. */
    invalidateCache() {
      cache.clear();
    },

    /** Clear cache and release resources. */
    destroy() {
      cache.clear();
      currentUser = null;
    },
  };
}
