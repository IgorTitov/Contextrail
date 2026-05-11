/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Expose the single permitted entry point for the auth module, re-exporting port contracts, adapters, and domain utilities for external consumers.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the auth bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-062
 */

// Ports
export { assertAuthPort } from './ports/auth-port.mjs';
export { assertOAuthProviderPort } from './ports/oauth-provider-port.mjs';

// Adapters
export { createAnonymousAdapter } from './adapters/anonymous-adapter.mjs';
export { createLocalPasswordAdapter } from './adapters/local-password-adapter.mjs';
export { createOAuthStubAdapter } from './adapters/oauth-stub-adapter.mjs';
export { createJwtAdapter } from './adapters/jwt-adapter.mjs';
export { createServerSessionAdapter } from './adapters/server-session-adapter.mjs';
export { createGoogleOAuthProvider } from './adapters/google-oauth-provider.mjs';
export { createGitHubOAuthProvider } from './adapters/github-oauth-provider.mjs';
export { createMemoryOAuthProvider } from './adapters/memory-oauth-provider.mjs';
export {
  nodeRandomBytesFn,
  nodeSha256Fn,
  createNodePkcePair,
  createNodeOAuthState,
} from './adapters/node-oauth-crypto.mjs';

// OAuth flow domain (pure primitives)
export {
  base64url,
  generatePkcePair,
  generateOAuthState,
  buildAuthorizeUrl,
  toAuthUserFromGoogle,
  toAuthUserFromGithub,
} from './domain/oauth-flow.mjs';

// JWT test utilities (for generating signed tokens in tests)
export {
  createTestKeyPair,
  createTestSecret,
  signTestToken,
} from './adapters/jwt-test-helpers.mjs';

// Domain utilities
export { createRouteGuard } from './domain/route-guard.mjs';
export { createAuthenticatedClient } from './domain/auth-api-integration.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
