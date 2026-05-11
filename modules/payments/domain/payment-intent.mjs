/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure payment-intent domain — construction and state-machine transitions.
 * @sidecar payment-intent.mjs.header.md
 * @layer domain | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { createMoney } from './money.mjs';

/**
 * Pure domain for payment intents. Validates input, enforces the state
 * machine, and returns immutable intent records. No I/O, no clocks, no
 * framework dependencies — adapters own id generation, timestamps, and
 * provider round-trips.
 *
 * State machine:
 *
 *   requires_payment_method
 *       │  confirm({ paymentMethod })
 *       ▼
 *   succeeded ──► refund(*) ──► partially_refunded ──► refund(rest) ──► refunded
 *       │
 *       └── (simulated decline) ──► failed
 *
 *   canceled is a terminal state reachable from requires_payment_method.
 *
 * @typedef {'requires_payment_method' | 'succeeded' | 'failed' | 'canceled' | 'partially_refunded' | 'refunded'} PaymentIntentStatus
 * @typedef {import('./money.mjs').Money} Money
 * @typedef {object} PaymentIntentInput
 * @property {Money} amount                               Total amount to charge.
 * @property {string} [customerId]                        Optional linked customer.
 * @property {string} [description]                       Human-readable description.
 * @property {Record<string, string>} [metadata]          Flat string metadata.
 * @typedef {object} PaymentIntent
 * @property {string} id
 * @property {Money} amount
 * @property {Money} amountRefunded
 * @property {PaymentIntentStatus} status
 * @property {string} [customerId]
 * @property {string} [description]
 * @property {string} [paymentMethod]
 * @property {Record<string, string>} metadata
 * @property {number} createdAt
 * @property {number} [confirmedAt]
 */

/**
 * Validate raw input and return a normalized {@link PaymentIntentInput}.
 * Domain only — adapters stamp id, createdAt, and status.
 *
 * @param {PaymentIntentInput} input
 * @returns {PaymentIntentInput & { amount: Money, metadata: Record<string, string> }}
 */
export function validatePaymentIntentInput(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('payments.intent.invalid'));
  }
  if (!input.amount) {
    throw new TypeError(t('payments.intent.missing_amount'));
  }
  const amount = createMoney(input.amount);

  if (input.customerId != null) {
    if (typeof input.customerId !== 'string' || input.customerId.length === 0) {
      throw new TypeError(t('payments.intent.invalid_customer'));
    }
  }
  if (input.description != null && typeof input.description !== 'string') {
    throw new TypeError(t('payments.intent.invalid_description'));
  }

  /** @type {Record<string, string>} */
  const metadata = {};
  if (input.metadata != null) {
    if (typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
      throw new TypeError(t('payments.intent.invalid_metadata'));
    }
    for (const [k, v] of Object.entries(input.metadata)) {
      if (typeof v !== 'string') {
        throw new TypeError(t('payments.intent.invalid_metadata'));
      }
      metadata[k] = v;
    }
  }

  /** @type {PaymentIntentInput & { amount: Money, metadata: Record<string, string> }} */
  const out = { amount, metadata };
  if (input.customerId) out.customerId = input.customerId;
  if (input.description) out.description = input.description;
  return out;
}

/**
 * Return the next status after a successful confirm. Throws if the intent
 * cannot be confirmed from its current status.
 *
 * @param {PaymentIntent} intent
 * @param {string} paymentMethod
 * @returns {PaymentIntentStatus}
 */
export function nextConfirmStatus(intent, paymentMethod) {
  if (typeof paymentMethod !== 'string' || paymentMethod.length === 0) {
    throw new TypeError(t('payments.intent.missing_payment_method'));
  }
  if (intent.status !== 'requires_payment_method') {
    throw new TypeError(
      t('payments.intent.not_confirmable', { id: intent.id, status: intent.status }),
    );
  }
  // Convention: payment methods whose name starts with "pm_fail" simulate a
  // declined charge. Useful for deterministic test coverage of the failed
  // branch without introducing real card numbers.
  return paymentMethod.startsWith('pm_fail') ? 'failed' : 'succeeded';
}

/**
 * Decide the next status after a refund and return the updated refunded
 * amount. Throws if the refund is not allowed.
 *
 * @param {PaymentIntent} intent
 * @param {Money} refundAmount
 * @returns {{ status: PaymentIntentStatus, amountRefunded: Money }}
 */
export function nextRefundState(intent, refundAmount) {
  if (intent.status !== 'succeeded' && intent.status !== 'partially_refunded') {
    throw new TypeError(
      t('payments.intent.not_refundable', { id: intent.id, status: intent.status }),
    );
  }
  if (refundAmount.currency !== intent.amount.currency) {
    throw new TypeError(t('payments.money.invalid_currency'));
  }
  const nextRefunded = intent.amountRefunded.amount + refundAmount.amount;
  if (nextRefunded > intent.amount.amount) {
    throw new TypeError(t('payments.intent.refund_too_large', { id: intent.id }));
  }
  const status = nextRefunded === intent.amount.amount ? 'refunded' : 'partially_refunded';
  return {
    status,
    amountRefunded: { amount: nextRefunded, currency: intent.amount.currency },
  };
}
