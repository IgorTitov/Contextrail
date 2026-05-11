/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Static Rules adapter for the permission module.
 * @sidecar static-rules-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Static in-memory permission adapter.
 * Evaluates rules in order with first-match-wins semantics.
 * Supports role hierarchy for inherited permissions.
 *
 * @module
 */

import { createRoleHierarchy } from '../domain/role-hierarchy.mjs';
import { matchRule } from '../domain/rule-matcher.mjs';

/**
 * @typedef {Object} StaticRulesConfig
 * @property {import('../ports/permission-port.mjs').RoleHierarchyConfig} [roles]
 * @property {import('../ports/permission-port.mjs').PermissionRule[]} rules
 * @property {'allow' | 'deny'} [defaultEffect]
 */

/**
 * Create a static rules permission adapter.
 *
 * @param {StaticRulesConfig} config
 * @returns {import('../ports/permission-port.mjs').PermissionPort}
 */
export function createStaticRulesAdapter(config) {
  const hierarchy = createRoleHierarchy(config.roles || {});
  const defaultEffect = config.defaultEffect || 'deny';

  /** @type {import('../ports/permission-port.mjs').PermissionRule[]} */
  let rules = [...config.rules];

  /** @type {{ role: string } | null} */
  let currentUser = null;

  /**
   * Evaluate permission for the current user.
   * Resolves all effective roles (including inherited), then checks rules
   * in order. First matching rule wins. If no rule matches, returns the
   * configured default effect.
   *
   * @param {string} action
   * @param {string} resource
   * @param {Record<string, any>} [conditions]
   * @returns {boolean}
   */
  function can(action, resource, conditions) {
    if (!currentUser) return defaultEffect === 'allow';

    const effectiveRoles = hierarchy.resolveRoles(currentUser.role);

    for (const rule of rules) {
      if (!effectiveRoles.includes(rule.role)) continue;
      if (matchRule(rule, action, resource, conditions)) {
        return rule.effect === 'allow';
      }
    }

    return defaultEffect === 'allow';
  }

  return {
    can,

    cannot(action, resource, conditions) {
      return !can(action, resource, conditions);
    },

    grant(rule) {
      rules.push({ ...rule });
    },

    revoke(action, resource, role) {
      rules = rules.filter((r) => {
        const actionMatch = r.action === action;
        const resourceMatch = r.resource === resource;
        const roleMatch = role ? r.role === role : true;
        return !(actionMatch && resourceMatch && roleMatch);
      });
    },

    getRulesForRole(role) {
      const effectiveRoles = hierarchy.resolveRoles(role);
      return rules.filter((r) => effectiveRoles.includes(r.role));
    },

    setUser(user) {
      currentUser = user;
    },
  };
}
