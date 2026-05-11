/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Public Api.D implementation for the auth module.
 * @sidecar public-api.d.ts.header.md
 * @layer module | @hex application | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the auth public API.
 *
 * SpecRefs: TPL-062; TPL-063
 */

export {
  AuthUser,
  AuthCredentials,
  AuthResult,
  AuthChangeEvent,
  AuthPort,
  assertAuthPort,
} from './ports/auth-port.js';

export { createAnonymousAdapter } from './adapters/anonymous-adapter.js';
export { createLocalPasswordAdapter } from './adapters/local-password-adapter.js';
export { createOAuthStubAdapter } from './adapters/oauth-stub-adapter.js';
export { createJwtAdapter } from './adapters/jwt-adapter.js';
export { createTestKeyPair, createTestSecret, signTestToken } from './adapters/jwt-test-helpers.js';
export { createRouteGuard, RouteConfig, AccessDecision } from './domain/route-guard.js';
export { createAuthenticatedClient } from './domain/auth-api-integration.js';
