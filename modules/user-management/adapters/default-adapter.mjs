/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory user management adapter for tests and development.
 * @sidecar default-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx user-management
 * @public false
 * @edit careful
 */

import {
  registerUser,
  verifyEmail,
  createInvitation,
  createPasswordReset,
  isTokenValid,
  updateProfile,
} from '../domain/user-management.mjs';

/**
 * Create an in-memory user management adapter.
 * @returns {import('../ports/user-management-port.mjs').UserManagementPort}
 */
export function createMemoryUserManagementAdapter() {
  /** @type {Map<string, import('../domain/user-management.mjs').User>} */
  const users = new Map();
  /** @type {Map<string, string>} */ // token → userId
  const verificationTokens = new Map();
  /** @type {Map<string, import('../domain/user-management.mjs').Invitation>} */
  const invitations = new Map();
  /** @type {Map<string, import('../domain/user-management.mjs').PasswordResetRequest>} */
  const resetRequests = new Map();

  return {
    async register(input) {
      const result = registerUser(input);
      if (!result.ok) throw new Error(result.error);
      users.set(result.user.id, result.user);
      verificationTokens.set(result.verificationToken, result.user.id);
      return { user: result.user, verificationToken: result.verificationToken };
    },

    async verifyEmail(token) {
      const userId = verificationTokens.get(token);
      if (!userId) throw new Error('invalid-verification-token');
      const user = users.get(userId);
      if (!user) throw new Error('user-not-found');
      const result = verifyEmail(user);
      if (!result.ok) throw new Error(result.error);
      users.set(userId, result.user);
      verificationTokens.delete(token);
      return result.user;
    },

    async getById(id) {
      return users.get(id) || null;
    },

    async getByEmail(email) {
      for (const user of users.values()) {
        if (user.email === email) return user;
      }
      return null;
    },

    async updateProfile(id, updates) {
      const user = users.get(id);
      if (!user) throw new Error('user-not-found');
      const updated = updateProfile(user, updates);
      users.set(id, updated);
      return updated;
    },

    async suspend(id) {
      const user = users.get(id);
      if (!user) throw new Error('user-not-found');
      users.set(id, { ...user, status: 'suspended' });
    },

    async delete(id) {
      const user = users.get(id);
      if (!user) throw new Error('user-not-found');
      users.set(id, { ...user, status: 'deleted' });
    },

    async invite(email, invitedBy) {
      const invitation = createInvitation(email, invitedBy);
      invitations.set(invitation.token, invitation);
      return invitation;
    },

    async acceptInvitation(token) {
      const invitation = invitations.get(token);
      if (!invitation) throw new Error('invalid-invitation-token');
      if (!isTokenValid(invitation)) throw new Error('invitation-expired');
      const accepted = { ...invitation, status: /** @type {const} */ ('accepted') };
      invitations.set(token, accepted);
      return accepted;
    },

    async requestPasswordReset(email) {
      let userId = null;
      for (const user of users.values()) {
        if (user.email === email) {
          userId = user.id;
          break;
        }
      }
      if (!userId) throw new Error('user-not-found');
      const request = createPasswordReset(userId);
      resetRequests.set(request.token, request);
      return request;
    },

    async resetPassword(token, _newPasswordHash) {
      const request = resetRequests.get(token);
      if (!request) throw new Error('invalid-reset-token');
      if (!isTokenValid(request)) throw new Error('reset-token-expired');
      resetRequests.set(token, { ...request, used: true });
    },

    clear() {
      users.clear();
      verificationTokens.clear();
      invitations.clear();
      resetRequests.clear();
    },
  };
}
