/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure webhook-event domain — parse Stripe-style signature header (no crypto).
 * @sidecar webhook-event.mjs.header.md
 * @layer domain | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure domain for payment provider webhook parsing. Implements the
 * Stripe-style signature header format (`t=<timestamp>,v1=<hex>`) without
 * any reference to `node:crypto` — HMAC computation and constant-time
 * comparison live in an adapter that injects the primitives back into
 * `verifyWebhookSignatureWith`. This keeps the domain framework-free and
 * lets browser/WebCrypto adapters plug in later with the same shape.
 *
 * @typedef {object} WebhookSignature
 * @property {number} timestamp
 * @property {string[]} signatures
 * @typedef {object} VerifyOptions
 * @property {number} [toleranceSeconds]  Max clock skew in seconds (default 300).
 * @property {() => number} [now]         Clock override in ms (default Date.now).
 * @typedef {object} CryptoBridge
 * @property {(rawBody: string, timestamp: number, secret: string) => string} hmacSha256Hex
 * @property {(a: string, b: string) => boolean} constantTimeEqualHex
 */

/**
 * Parse a Stripe-style `t=...,v1=...` signature header into a structured
 * object. Accepts multiple `v1=...` entries (signature rotation). Throws
 * TypeError with an i18n key on any structural problem.
 *
 * @param {string} header
 * @returns {WebhookSignature}
 */
export function parseSignatureHeader(header) {
  if (typeof header !== 'string' || header.length === 0) {
    throw new TypeError(t('payments.webhook.invalid_signature_header'));
  }
  /** @type {number | null} */
  let timestamp = null;
  /** @type {string[]} */
  const signatures = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new TypeError(t('payments.webhook.invalid_timestamp'));
      }
      timestamp = parsed;
    } else if (key === 'v1' && value.length > 0) {
      signatures.push(value);
    }
  }
  if (timestamp === null) {
    throw new TypeError(t('payments.webhook.invalid_timestamp'));
  }
  if (signatures.length === 0) {
    throw new TypeError(t('payments.webhook.invalid_signature_header'));
  }
  return { timestamp, signatures };
}

/**
 * Verify a Stripe-style webhook signature using injected crypto primitives.
 * Returns true only if the timestamp is within tolerance and at least one
 * provided signature matches the HMAC of `<timestamp>.<rawBody>` in
 * constant time.
 *
 * Throws TypeError with an i18n key on any structural problem or mismatch.
 *
 * @param {CryptoBridge} bridge
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @param {string} secret
 * @param {VerifyOptions} [options]
 * @returns {true}
 */
export function verifyWebhookSignatureWith(bridge, rawBody, signatureHeader, secret, options = {}) {
  if (typeof rawBody !== 'string' || rawBody.length === 0) {
    throw new TypeError(t('payments.webhook.invalid_body'));
  }
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new TypeError(t('payments.webhook.invalid_secret'));
  }
  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  const toleranceSeconds = options.toleranceSeconds ?? 300;
  const nowMs = (options.now ?? Date.now)();
  const nowSeconds = Math.floor(nowMs / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new TypeError(t('payments.webhook.timestamp_out_of_range'));
  }
  const expected = bridge.hmacSha256Hex(rawBody, timestamp, secret);
  for (const candidate of signatures) {
    if (bridge.constantTimeEqualHex(candidate, expected)) return true;
  }
  throw new TypeError(t('payments.webhook.signature_mismatch'));
}
