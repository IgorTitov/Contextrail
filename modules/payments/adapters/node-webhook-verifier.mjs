/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Node crypto bridge for webhook signature verification — injects HMAC-SHA256 + constant-time compare.
 * @sidecar node-webhook-verifier.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { verifyWebhookSignatureWith, parseSignatureHeader } from '../domain/webhook-event.mjs';

/**
 * Node `node:crypto` bridge. Implements the {@link CryptoBridge} shape the
 * pure domain expects, so `verifyWebhookSignature` can run on a server
 * without the domain ever importing infrastructure. A browser/WebCrypto
 * adapter can ship later with the same shape.
 *
 * @type {import('../domain/webhook-event.mjs').CryptoBridge}
 */
export const nodeCryptoBridge = {
  hmacSha256Hex(rawBody, timestamp, secret) {
    return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  },
  constantTimeEqualHex(a, b) {
    let bufA;
    let bufB;
    try {
      bufA = Buffer.from(a, 'hex');
      bufB = Buffer.from(b, 'hex');
    } catch {
      return false;
    }
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  },
};

/**
 * Convenience — compute the expected HMAC-SHA256 hex signature for a
 * `<timestamp>.<rawBody>` payload using Node crypto.
 *
 * @param {string} rawBody
 * @param {number} timestamp
 * @param {string} secret
 * @returns {string}
 */
export function computeSignature(rawBody, timestamp, secret) {
  return nodeCryptoBridge.hmacSha256Hex(rawBody, timestamp, secret);
}

/**
 * Verify a Stripe-style webhook signature using the Node crypto bridge.
 * Thin wrapper over the pure domain verifier with the bridge pre-applied.
 *
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @param {string} secret
 * @param {import('../domain/webhook-event.mjs').VerifyOptions} [options]
 * @returns {true}
 */
export function verifyWebhookSignature(rawBody, signatureHeader, secret, options) {
  return verifyWebhookSignatureWith(nodeCryptoBridge, rawBody, signatureHeader, secret, options);
}

// Re-export parsing helper for test parity and convenience.
export { parseSignatureHeader };
