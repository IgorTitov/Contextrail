/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Auth Api Integration.D implementation for the auth module.
 * @sidecar auth-api-integration.d.ts.header.md
 * @layer module | @hex domain | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the auth-api integration.
 *
 * SpecRefs: TPL-070
 */

import type { AuthPort } from '../ports/auth-port.js';

/**
 * Minimal ApiClientPort shape used by the integration.
 * Inlined to avoid cross-module relative import.
 */
interface ApiClientPortLike {
  get(url: string, options?: any): Promise<any>;
  post(url: string, body?: any, options?: any): Promise<any>;
  put(url: string, body?: any, options?: any): Promise<any>;
  delete(url: string, options?: any): Promise<any>;
  setBaseUrl(url: string): void;
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
}

export interface AuthenticatedClient extends ApiClientPortLike {
  destroy(): void;
}

export function createAuthenticatedClient(
  authAdapter: AuthPort,
  apiClient: ApiClientPortLike,
): AuthenticatedClient;
