/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for user management adapters (CRUD, invitation, verification, password reset).
 * @sidecar user-management-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx user-management
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * @typedef {import('../domain/user-management.mjs').User} User
 * @typedef {import('../domain/user-management.mjs').RegisterInput} RegisterInput
 * @typedef {import('../domain/user-management.mjs').Invitation} Invitation
 * @typedef {import('../domain/user-management.mjs').PasswordResetRequest} PasswordResetRequest
 *
 * @typedef {Object} UserManagementPort
 * @property {(input: RegisterInput) => Promise<{ user: User, verificationToken: string }>} register
 * @property {(token: string) => Promise<User>} verifyEmail
 * @property {(id: string) => Promise<User | null>} getById
 * @property {(email: string) => Promise<User | null>} getByEmail
 * @property {(id: string, updates: object) => Promise<User>} updateProfile
 * @property {(id: string) => Promise<void>} suspend
 * @property {(id: string) => Promise<void>} delete
 * @property {(email: string, invitedBy: string) => Promise<Invitation>} invite
 * @property {(token: string) => Promise<Invitation>} acceptInvitation
 * @property {(email: string) => Promise<PasswordResetRequest>} requestPasswordReset
 * @property {(token: string, newPasswordHash: string) => Promise<void>} resetPassword
 * @property {() => void} clear
 */

const REQUIRED = [
  'register', 'verifyEmail', 'getById', 'getByEmail',
  'updateProfile', 'suspend', 'delete', 'invite',
  'acceptInvitation', 'requestPasswordReset', 'resetPassword', 'clear',
];

/**
 * @param {unknown} adapter
 * @throws {TypeError}
 */
export function assertUserManagementPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('user-management.port.invalid_adapter'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('user-management.port.missing_method', { method }));
    }
  }
}
