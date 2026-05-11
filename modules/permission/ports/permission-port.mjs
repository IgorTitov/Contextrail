/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Permission port contract for the permission module.
 * @sidecar permission-port.mjs.header.md
 * @layer module | @hex port | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Port contract for permission-checking adapters.
 *
 * @typedef {Object} PermissionRule
 * @property {string} role
 * @property {string} action
 * @property {string} resource
 * @property {'allow' | 'deny'} effect
 * @property {Record<string, any>} [conditions]
 *
 * @typedef {Record<string, string[]>} RoleHierarchyConfig
 * Maps a role to the parent roles it inherits from.
 *
 * @typedef {Object} PermissionCheck
 * @property {boolean} allowed
 * @property {PermissionRule} [rule]
 * @property {string} [reason]
 *
 * @typedef {Object} ResourceAction
 * @property {string} action
 * @property {string} resource
 * @property {Record<string, any>} [conditions]
 *
 * @typedef {Object} PermissionPort
 * @property {(action: string, resource: string, conditions?: Record<string, any>) => boolean} can
 * @property {(action: string, resource: string, conditions?: Record<string, any>) => boolean} cannot
 * @property {(rule: PermissionRule) => void} grant
 * @property {(action: string, resource: string, role?: string) => void} revoke
 * @property {(role: string) => PermissionRule[]} getRulesForRole
 * @property {(user: { role: string }) => void} setUser
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = ['can', 'cannot', 'grant', 'revoke', 'getRulesForRole', 'setUser'];

/**
 * Validate that an adapter conforms to the PermissionPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertPermissionPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('permission.port.invalid_adapter'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('permission.port.missing_method', { method }));
    }
  }
}
