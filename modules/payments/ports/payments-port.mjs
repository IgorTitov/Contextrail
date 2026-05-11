/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for payment provider adapters (customers, intents, refunds, webhooks).
 * @sidecar payments-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for payment provider adapters. Adapters own integration with
 * a real provider (Stripe, Braintree, Adyen, Paddle, Lemon Squeezy …) or an
 * in-memory fake for tests. The domain validates money, intent inputs, and
 * webhook signatures; the adapter stamps ids, timestamps, and performs
 * network round-trips.
 *
 * This port is deliberately narrow: createCustomer + createPaymentIntent +
 * confirmPaymentIntent + refund + verifyWebhook covers the core flow most
 * SaaS templates need. Adapters may expose richer provider APIs internally,
 * but cross-module callers must go through this contract only.
 *
 * @typedef {import('../domain/money.mjs').Money} Money
 * @typedef {import('../domain/payment-intent.mjs').PaymentIntent} PaymentIntent
 * @typedef {import('../domain/payment-intent.mjs').PaymentIntentInput} PaymentIntentInput
 * @typedef {import('../domain/payment-intent.mjs').PaymentIntentStatus} PaymentIntentStatus
 *
 * @typedef {object} Customer
 * @property {string} id
 * @property {string} email
 * @property {string} [name]
 * @property {Record<string, string>} metadata
 * @property {number} createdAt
 *
 * @typedef {object} CustomerInput
 * @property {string} email
 * @property {string} [name]
 * @property {Record<string, string>} [metadata]
 *
 * @typedef {object} ConfirmOptions
 * @property {string} paymentMethod
 *
 * @typedef {object} RefundOptions
 * @property {Money} [amount]  Partial refund amount (defaults to remaining balance).
 *
 * @typedef {object} Refund
 * @property {string} id
 * @property {string} intentId
 * @property {Money} amount
 * @property {number} createdAt
 *
 * @typedef {object} IntentFilter
 * @property {PaymentIntentStatus} [status]
 * @property {string} [customerId]
 *
 * @typedef {object} PaymentsPort
 * @property {(input: CustomerInput) => Promise<Customer>} createCustomer                          Create a customer record.
 * @property {(input: PaymentIntentInput) => Promise<PaymentIntent>} createPaymentIntent           Create a payment intent in `requires_payment_method`.
 * @property {(id: string, options: ConfirmOptions) => Promise<PaymentIntent>} confirmPaymentIntent Confirm an intent with a payment method.
 * @property {(intentId: string, options?: RefundOptions) => Promise<Refund>} refund               Refund all or part of a succeeded intent.
 * @property {(rawBody: string, signature: string, secret: string) => true} verifyWebhook          Verify a webhook HMAC signature (throws on mismatch).
 * @property {(filter?: IntentFilter) => PaymentIntent[]} listIntents                              Snapshot of known intents for tests and dev.
 * @property {() => void} clear                                                                    Drop customers, intents, and refunds.
 */

const REQUIRED = [
  ['createCustomer', 'payments.port.missing_createCustomer'],
  ['createPaymentIntent', 'payments.port.missing_createPaymentIntent'],
  ['confirmPaymentIntent', 'payments.port.missing_confirmPaymentIntent'],
  ['refund', 'payments.port.missing_refund'],
  ['verifyWebhook', 'payments.port.missing_verifyWebhook'],
  ['listIntents', 'payments.port.missing_listIntents'],
  ['clear', 'payments.port.missing_clear'],
];

/**
 * Validate that an adapter conforms to the PaymentsPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertPaymentsPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('payments.port.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
