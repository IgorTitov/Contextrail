/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure domain logic for user lifecycle — registration, profile, invitation, verification, password reset.
 * @sidecar user-management.mjs.header.md
 * @layer domain | @hex _none_ | @ctx user-management
 * @public false
 * @edit careful
 */

/**
 * @typedef {'active' | 'pending_verification' | 'suspended' | 'deleted'} UserStatus
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} [displayName]
 * @property {UserStatus} status
 * @property {string} createdAt - ISO date
 * @property {string} [verifiedAt] - ISO date
 * @property {string} [lastLoginAt] - ISO date
 * @property {Record<string, string>} [metadata]
 */

/**
 * @typedef {Object} RegisterInput
 * @property {string} email
 * @property {string} [displayName]
 * @property {Record<string, string>} [metadata]
 */

/**
 * @typedef {Object} Invitation
 * @property {string} id
 * @property {string} email
 * @property {string} invitedBy - user ID
 * @property {string} token
 * @property {'pending' | 'accepted' | 'expired'} status
 * @property {string} createdAt - ISO date
 * @property {string} expiresAt - ISO date
 */

/**
 * @typedef {Object} PasswordResetRequest
 * @property {string} userId
 * @property {string} token
 * @property {string} createdAt - ISO date
 * @property {string} expiresAt - ISO date
 * @property {boolean} used
 */

/**
 * Create a new user in pending_verification state.
 * @param {RegisterInput} input
 * @returns {{ ok: true, user: User, verificationToken: string } | { ok: false, error: string }}
 */
export function registerUser(input) {
  if (!input.email || !input.email.includes('@')) {
    return { ok: false, error: 'invalid-email' };
  }
  const now = new Date().toISOString();
  return {
    ok: true,
    user: {
      id: `usr_${Date.now()}`,
      email: input.email,
      displayName: input.displayName || '',
      status: 'pending_verification',
      createdAt: now,
      metadata: input.metadata || {},
    },
    verificationToken: `vrf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };
}

/**
 * Mark user as verified.
 * @param {User} user
 * @returns {{ ok: true, user: User } | { ok: false, error: string }}
 */
export function verifyEmail(user) {
  if (user.status !== 'pending_verification') {
    return { ok: false, error: 'not-pending-verification' };
  }
  return {
    ok: true,
    user: { ...user, status: 'active', verifiedAt: new Date().toISOString() },
  };
}

/**
 * Create an invitation token.
 * @param {string} email
 * @param {string} invitedBy - user ID
 * @param {number} [ttlHours=72]
 * @returns {Invitation}
 */
export function createInvitation(email, invitedBy, ttlHours = 72) {
  const now = new Date();
  const expires = new Date(now);
  expires.setHours(expires.getHours() + ttlHours);
  return {
    id: `inv_${Date.now()}`,
    email,
    invitedBy,
    token: `inv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

/**
 * Create a password reset request.
 * @param {string} userId
 * @param {number} [ttlMinutes=60]
 * @returns {PasswordResetRequest}
 */
export function createPasswordReset(userId, ttlMinutes = 60) {
  const now = new Date();
  const expires = new Date(now);
  expires.setMinutes(expires.getMinutes() + ttlMinutes);
  return {
    userId,
    token: `rst_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    used: false,
  };
}

/**
 * Check if a token is still valid (not expired, not used).
 * @param {{ expiresAt: string, used?: boolean }} tokenObj
 * @returns {boolean}
 */
export function isTokenValid(tokenObj) {
  if (tokenObj.used) return false;
  return new Date(tokenObj.expiresAt) > new Date();
}

/**
 * Update user profile fields.
 * @param {User} user
 * @param {{ displayName?: string, metadata?: Record<string, string> }} updates
 * @returns {User}
 */
export function updateProfile(user, updates) {
  return {
    ...user,
    displayName: updates.displayName ?? user.displayName,
    metadata: updates.metadata ? { ...user.metadata, ...updates.metadata } : user.metadata,
  };
}
