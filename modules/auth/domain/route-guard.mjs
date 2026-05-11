/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Evaluate whether the current auth state permits navigation to a given route, returning a redirect decision without performing navigation itself.
 * @sidecar route-guard.mjs.header.md
 * @layer module | @hex domain | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Route guard utility that evaluates navigation access from auth state.
 * Pure domain logic — does not perform navigation itself.
 *
 * SpecRefs: TPL-067
 *
 * @typedef {Object} RouteConfig
 * @property {string} path
 * @property {boolean} [requiresAuth]
 * @property {string[]} [requiredRoles]
 * @property {string} [redirectTo]
 *
 * @typedef {Object} AccessDecision
 * @property {boolean} allowed
 * @property {string} [redirectTo]
 * @property {string} [reason] - i18n message key
 */

/**
 * Create a route guard bound to an auth adapter.
 *
 * @param {import('../ports/auth-port.mjs').AuthPort} authAdapter
 * @returns {{ canAccess: (route: RouteConfig) => AccessDecision }}
 */
export function createRouteGuard(authAdapter) {
  return {
    /**
     * Evaluate whether the current auth state allows access to the route.
     *
     * @param {RouteConfig} route
     * @returns {AccessDecision}
     */
    canAccess(route) {
      // Routes that don't require auth are always accessible
      if (!route.requiresAuth) {
        return { allowed: true };
      }

      // Check authentication
      if (!authAdapter.isAuthenticated()) {
        return {
          allowed: false,
          redirectTo: route.redirectTo,
          reason: 'auth.guard.not_authenticated',
        };
      }

      // Check role requirements
      if (route.requiredRoles && route.requiredRoles.length > 0) {
        const user = authAdapter.getUser();
        if (!user || !route.requiredRoles.includes(user.role)) {
          return {
            allowed: false,
            redirectTo: route.redirectTo,
            reason: 'auth.guard.insufficient_role',
          };
        }
      }

      return { allowed: true };
    },
  };
}
