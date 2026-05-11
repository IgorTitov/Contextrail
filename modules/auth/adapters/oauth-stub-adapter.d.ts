/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Oauth Stub Adapter.D adapter for the auth module.
 * @sidecar oauth-stub-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the OAuth stub adapter.
 *
 * SpecRefs: TPL-066
 */

import type { AuthPort, AuthUser } from '../ports/auth-port.js';

export interface OAuthStubConfig {
  providerName: string;
  mockDelay?: number;
  mockUser?: AuthUser;
}

export function createOAuthStubAdapter(config: OAuthStubConfig): AuthPort;
