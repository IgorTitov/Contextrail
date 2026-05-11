/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Plan-based entitlement check that combines role permissions with subscription plan access.
 * @sidecar entitlement.mjs.header.md
 * @layer module | @hex domain | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Check if an action is allowed by combining role-based permission with
 * plan-based entitlement.
 *
 * The rule: a user can perform an action if:
 * 1. Their role allows it (via permission rules), AND
 * 2. Their plan grants the required entitlement (if the feature is gated)
 *
 * Features without plan gating are role-only. Features with plan gating
 * require both role AND plan to pass.
 *
 * @param {{ role: string, planEntitlements: string[] }} user
 * @param {string} action
 * @param {string} resource
 * @param {{ gatedFeature?: string }} [options]
 * @param {(role: string, action: string, resource: string) => boolean} roleCheck
 * @returns {{ allowed: boolean, reason: string }}
 */
export function checkAccess(user, action, resource, options, roleCheck) {
  const roleAllowed = roleCheck(user.role, action, resource);
  if (!roleAllowed) {
    return { allowed: false, reason: 'role-denied' };
  }

  if (options?.gatedFeature) {
    const planAllowed = user.planEntitlements.includes(options.gatedFeature);
    if (!planAllowed) {
      return { allowed: false, reason: 'plan-denied' };
    }
  }

  return { allowed: true, reason: 'allowed' };
}
