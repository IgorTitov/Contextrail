/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide test utilities for generating signed JWTs so that JWT adapter tests and integration tests can work with real cryptographic tokens.
 * @sidecar jwt-test-helpers.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit rewrite-ok
 */

/**
 * JWT test utilities. Generate ephemeral keys and signed tokens for testing.
 * For test use only — do not use in production.
 *
 * SpecRefs: TPL-135
 */

import { SignJWT, generateKeyPair, generateSecret } from 'jose';

/**
 * Generate an ephemeral ES256 key pair for testing.
 * @returns {Promise<{ publicKey: import('jose').KeyLike, privateKey: import('jose').KeyLike }>}
 */
export async function createTestKeyPair() {
  return generateKeyPair('ES256');
}

/**
 * Generate an ephemeral HS256 secret for testing.
 * @returns {Promise<import('jose').KeyLike>}
 */
export async function createTestSecret() {
  return generateSecret('HS256');
}

/**
 * Sign a test JWT with the given claims and key.
 *
 * @param {Object} options
 * @param {Record<string, unknown>} options.claims - JWT payload claims (sub, name, role, etc.)
 * @param {import('jose').KeyLike | Uint8Array} options.signingKey - Private key or symmetric secret
 * @param {string} [options.algorithm] - Algorithm (default: 'ES256')
 * @param {string} [options.issuer] - Issuer claim
 * @param {string} [options.audience] - Audience claim
 * @param {string} [options.expiresIn] - Expiration (e.g., '15m', '1h'). Default: '15m'
 * @returns {Promise<string>} Signed JWT string
 */
export async function signTestToken({
  claims,
  signingKey,
  algorithm = 'ES256',
  issuer,
  audience,
  expiresIn = '15m',
}) {
  let builder = new SignJWT(/** @type {import('jose').JWTPayload} */ (claims))
    .setProtectedHeader({ alg: algorithm })
    .setIssuedAt()
    .setExpirationTime(expiresIn);

  if (issuer) builder = builder.setIssuer(issuer);
  if (audience) builder = builder.setAudience(audience);
  if (claims.sub) builder = builder.setSubject(String(claims.sub));

  return builder.sign(signingKey);
}
