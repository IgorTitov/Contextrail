/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Rule Matcher domain logic for the permission module.
 * @sidecar rule-matcher.mjs.header.md
 * @layer module | @hex domain | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for matching permission rules against an action/resource pair.
 * Framework-free, no external dependencies.
 */

/**
 * Check whether a rule matches the given action, resource, and optional conditions.
 *
 * - Supports wildcard '*' for action and resource (matches anything).
 * - Exact string match otherwise.
 * - Condition matching: every condition key present in the rule must match
 *   the corresponding key in the provided conditions (simple equality).
 *
 * @param {import('../ports/permission-port.mjs').PermissionRule} rule
 * @param {string} action
 * @param {string} resource
 * @param {Record<string, any>} [conditions]
 * @returns {boolean}
 */
export function matchRule(rule, action, resource, conditions) {
  const actionMatch = rule.action === '*' || rule.action === action;
  if (!actionMatch) return false;

  const resourceMatch = rule.resource === '*' || rule.resource === resource;
  if (!resourceMatch) return false;

  if (rule.conditions) {
    const provided = conditions || {};
    for (const [key, value] of Object.entries(rule.conditions)) {
      if (provided[key] !== value) return false;
    }
  }

  return true;
}
