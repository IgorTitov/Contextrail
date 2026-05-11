/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Auth State.D implementation for the auth module.
 * @sidecar auth-state.d.ts.header.md
 * @layer module | @hex domain | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the auth state domain.
 *
 * SpecRefs: TPL-063
 */

import type { AuthUser, AuthChangeEvent } from '../ports/auth-port.js';

export interface AuthState {
  getUser(): AuthUser | null;
  setUser(user: AuthUser | null): void;
  isAuthenticated(): boolean;
  onAuthChange(listener: (event: AuthChangeEvent) => void): void;
  offAuthChange(listener: (event: AuthChangeEvent) => void): void;
  notifyChange(type: 'login' | 'logout'): void;
}

export function createAuthState(): AuthState;
