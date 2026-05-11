/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the payments module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx payments
 * @public true
 * @edit careful
 */

// Domain
export { createMoney, addMoney, subtractMoney, formatMoney } from './domain/money.mjs';
export {
  validatePaymentIntentInput,
  nextConfirmStatus,
  nextRefundState,
} from './domain/payment-intent.mjs';
export { parseSignatureHeader, verifyWebhookSignatureWith } from './domain/webhook-event.mjs';

// Ports
export { assertPaymentsPort } from './ports/payments-port.mjs';

// Adapters
export { createMemoryPaymentsAdapter } from './adapters/memory-payments-adapter.mjs';
export {
  nodeCryptoBridge,
  computeSignature,
  verifyWebhookSignature,
} from './adapters/node-webhook-verifier.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
