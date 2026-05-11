/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Auth Port.D port for the auth module.
 * @sidecar auth-port.d.ts.header.md
 * @layer module | @hex port | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the auth port.
 *
 * SpecRefs: TPL-063
 */

export interface AuthUser {
  id: string;
  displayName: string;
  role: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthCredentials {
  username?: string;
  password?: string;
  provider?: string;
  token?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  /** i18n message key */
  error?: string;
}

export interface AuthChangeEvent {
  user: AuthUser | null;
  type: 'login' | 'logout';
}

export interface AuthPort {
  login(credentials?: AuthCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getUser(): AuthUser | null;
  isAuthenticated(): boolean;
  onAuthChange(listener: (event: AuthChangeEvent) => void): void;
  offAuthChange(listener: (event: AuthChangeEvent) => void): void;
}

export function assertAuthPort(adapter: unknown): asserts adapter is AuthPort;
