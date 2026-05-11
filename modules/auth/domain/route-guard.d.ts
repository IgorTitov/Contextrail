/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Route Guard.D implementation for the auth module.
 * @sidecar route-guard.d.ts.header.md
 * @layer module | @hex domain | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the route guard.
 *
 * SpecRefs: TPL-067
 */

import type { AuthPort } from '../ports/auth-port.js';

export interface RouteConfig {
  path: string;
  requiresAuth?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
}

export interface AccessDecision {
  allowed: boolean;
  redirectTo?: string;
  /** i18n message key */
  reason?: string;
}

export interface RouteGuard {
  canAccess(route: RouteConfig): AccessDecision;
}

export function createRouteGuard(authAdapter: AuthPort): RouteGuard;
