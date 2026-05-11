/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the user-management module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx user-management
 * @public true
 * @edit careful
 */

// Domain
export {
  registerUser,
  verifyEmail,
  createInvitation,
  createPasswordReset,
  isTokenValid,
  updateProfile,
} from './domain/user-management.mjs';

// Ports
export { assertUserManagementPort } from './ports/user-management-port.mjs';

// Adapters
export { createMemoryUserManagementAdapter } from './adapters/default-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
