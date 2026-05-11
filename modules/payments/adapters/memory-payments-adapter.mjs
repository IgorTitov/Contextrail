/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory PaymentsPort adapter — customers, intents, refunds, webhook verify for tests and dev.
 * @sidecar memory-payments-adapter.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { createMoney } from '../domain/money.mjs';
import {
  validatePaymentIntentInput,
  nextConfirmStatus,
  nextRefundState,
} from '../domain/payment-intent.mjs';
import { verifyWebhookSignature } from './node-webhook-verifier.mjs';

/**
 * In-memory PaymentsPort adapter. Backs a deterministic fake provider for
 * tests, local development, and the api-starter demo. All side effects are
 * confined to Maps in this closure; no network, no filesystem. A real
 * provider adapter (Stripe, Braintree, Adyen …) would implement the same
 * port and be swapped in at composition time.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]           Clock function (defaults to Date.now).
 * @param {() => number} [options.toleranceSeconds]  Not used directly; adapters may override per call.
 * @returns {import('../ports/payments-port.mjs').PaymentsPort}
 */
export function createMemoryPaymentsAdapter(options = {}) {
  const clock = options.now ?? Date.now;
  let customerCounter = 0;
  let intentCounter = 0;
  let refundCounter = 0;

  /** @type {Map<string, import('../ports/payments-port.mjs').Customer>} */
  const customers = new Map();
  /** @type {Map<string, import('../domain/payment-intent.mjs').PaymentIntent>} */
  const intents = new Map();
  /** @type {import('../ports/payments-port.mjs').Refund[]} */
  const refunds = [];

  return {
    async createCustomer(input) {
      if (!input || typeof input !== 'object') {
        throw new TypeError(t('payments.customer.invalid'));
      }
      if (typeof input.email !== 'string' || input.email.length === 0) {
        throw new TypeError(t('payments.customer.missing_email'));
      }
      if (input.name != null && typeof input.name !== 'string') {
        throw new TypeError(t('payments.customer.invalid_name'));
      }
      /** @type {Record<string, string>} */
      const metadata = {};
      if (input.metadata != null) {
        if (typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
          throw new TypeError(t('payments.customer.invalid'));
        }
        for (const [k, v] of Object.entries(input.metadata)) {
          if (typeof v !== 'string') {
            throw new TypeError(t('payments.customer.invalid'));
          }
          metadata[k] = v;
        }
      }
      const id = `cus_${++customerCounter}`;
      /** @type {import('../ports/payments-port.mjs').Customer} */
      const customer = {
        id,
        email: input.email,
        metadata,
        createdAt: clock(),
      };
      if (input.name) customer.name = input.name;
      customers.set(id, customer);
      return customer;
    },

    async createPaymentIntent(input) {
      const validated = validatePaymentIntentInput(input);
      const id = `pi_${++intentCounter}`;
      /** @type {import('../domain/payment-intent.mjs').PaymentIntent} */
      const intent = {
        id,
        amount: validated.amount,
        amountRefunded: { amount: 0, currency: validated.amount.currency },
        status: 'requires_payment_method',
        metadata: validated.metadata,
        createdAt: clock(),
      };
      if (validated.customerId) intent.customerId = validated.customerId;
      if (validated.description) intent.description = validated.description;
      intents.set(id, intent);
      return intent;
    },

    async confirmPaymentIntent(id, confirmOptions) {
      const intent = intents.get(id);
      if (!intent) {
        throw new TypeError(t('payments.intent.not_found', { id }));
      }
      if (!confirmOptions || typeof confirmOptions !== 'object') {
        throw new TypeError(t('payments.intent.missing_payment_method'));
      }
      const { paymentMethod } = confirmOptions;
      const nextStatus = nextConfirmStatus(intent, paymentMethod);
      const updated = {
        ...intent,
        status: nextStatus,
        paymentMethod,
        confirmedAt: clock(),
      };
      intents.set(id, updated);
      return updated;
    },

    async refund(intentId, refundOptions = {}) {
      const intent = intents.get(intentId);
      if (!intent) {
        throw new TypeError(t('payments.intent.not_found', { id: intentId }));
      }
      const requested = refundOptions.amount
        ? createMoney(refundOptions.amount)
        : {
            amount: intent.amount.amount - intent.amountRefunded.amount,
            currency: intent.amount.currency,
          };
      const { status, amountRefunded } = nextRefundState(intent, requested);
      const updated = { ...intent, status, amountRefunded };
      intents.set(intentId, updated);
      const refundId = `re_${++refundCounter}`;
      /** @type {import('../ports/payments-port.mjs').Refund} */
      const record = {
        id: refundId,
        intentId,
        amount: requested,
        createdAt: clock(),
      };
      refunds.push(record);
      return record;
    },

    verifyWebhook(rawBody, signature, secret) {
      return verifyWebhookSignature(rawBody, signature, secret, { now: clock });
    },

    listIntents(filter) {
      const all = [...intents.values()];
      if (!filter) return all;
      return all.filter((intent) => {
        if (filter.status && intent.status !== filter.status) return false;
        if (filter.customerId && intent.customerId !== filter.customerId) return false;
        return true;
      });
    },

    clear() {
      customers.clear();
      intents.clear();
      refunds.length = 0;
      customerCounter = 0;
      intentCounter = 0;
      refundCounter = 0;
    },
  };
}
