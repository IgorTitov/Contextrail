/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Local Password Adapter.D adapter for the auth module.
 * @sidecar local-password-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the local password adapter.
 *
 * SpecRefs: TPL-065
 */

import type { AuthPort, AuthResult } from '../ports/auth-port.js';

export interface StorageLike {
  load(): any;
  save(data: any): void;
}

export interface LocalPasswordAdapter extends AuthPort {
  register(username: string, password: string): AuthResult;
}

export function createLocalPasswordAdapter(
  storageAdapter: StorageLike,
): LocalPasswordAdapter;
