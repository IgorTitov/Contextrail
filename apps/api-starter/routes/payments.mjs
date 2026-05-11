/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Payments demo routes: create customer, create/confirm intent, list intents.
 * @sidecar payments.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * Payments demo routes — exercise the payments module's public API from a
 * host server using the in-memory adapter. Real deployments should swap
 * the adapter for a provider-specific one (Stripe, Adyen, Braintree) at
 * composition time without touching these routes.
 *
 * GET  /api/payments/customer?email=...        → create a customer
 * GET  /api/payments/intent?amount=...&currency=... → create a payment intent
 * GET  /api/payments/confirm?id=...&pm=...     → confirm an intent
 * GET  /api/payments/list?status=...           → list intents (optional filter)
 */

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function createCustomerHandler(req, ctx) {
  const email = req.query.get('email');
  const name = req.query.get('name') || undefined;
  if (!email) throw new TypeError('email is required');
  const customer = await ctx.payments.createCustomer({ email, name });
  ctx.log.info('Payments customer created', { id: customer.id });
  return { id: customer.id, email: customer.email, name: customer.name ?? null };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function createIntentHandler(req, ctx) {
  const amountStr = req.query.get('amount');
  const currency = req.query.get('currency') || 'USD';
  const description = req.query.get('description') || undefined;
  const customerId = req.query.get('customerId') || undefined;
  const amount = Number(amountStr);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new TypeError('amount must be a non-negative integer (minor units)');
  }
  const intent = await ctx.payments.createPaymentIntent({
    amount: { amount, currency },
    description,
    customerId,
  });
  ctx.log.info('Payments intent created', { id: intent.id, amount, currency });
  return {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    customerId: intent.customerId ?? null,
  };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function confirmIntentHandler(req, ctx) {
  const id = req.query.get('id');
  const pm = req.query.get('pm') || 'pm_card_visa';
  if (!id) throw new TypeError('id is required');
  const intent = await ctx.payments.confirmPaymentIntent(id, { paymentMethod: pm });
  ctx.log.info('Payments intent confirmed', { id, status: intent.status });
  return { id: intent.id, status: intent.status, paymentMethod: intent.paymentMethod };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function listIntentsHandler(req, ctx) {
  const status = req.query.get('status') || undefined;
  const customerId = req.query.get('customerId') || undefined;
  const intents = ctx.payments.listIntents({ status, customerId });
  return {
    total: intents.length,
    intents: intents.map((i) => ({
      id: i.id,
      status: i.status,
      amount: i.amount,
      amountRefunded: i.amountRefunded,
      customerId: i.customerId ?? null,
    })),
  };
}
