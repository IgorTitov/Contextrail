/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the payments bounded module — money, intent state machine, webhook verify, memory adapter.
 * @sidecar payments.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  createMoney,
  addMoney,
  subtractMoney,
  formatMoney,
  validatePaymentIntentInput,
  nextConfirmStatus,
  nextRefundState,
  parseSignatureHeader,
  computeSignature,
  verifyWebhookSignature,
  assertPaymentsPort,
  createMemoryPaymentsAdapter,
} from '../../modules/payments/public-api.mjs';

describe('payments domain — money', () => {
  test('createMoney accepts integer amounts and upper-cases currency', () => {
    const m = createMoney({ amount: 1999, currency: 'usd' });
    assert.deepEqual(m, { amount: 1999, currency: 'USD' });
  });

  test('createMoney allows zero', () => {
    assert.deepEqual(createMoney({ amount: 0, currency: 'EUR' }), { amount: 0, currency: 'EUR' });
  });

  test('createMoney rejects non-integer and negative amounts', () => {
    assert.throws(() => createMoney({ amount: 1.5, currency: 'USD' }), TypeError);
    assert.throws(() => createMoney({ amount: -1, currency: 'USD' }), TypeError);
    assert.throws(() => createMoney({ amount: 'nope', currency: 'USD' }), TypeError);
  });

  test('createMoney rejects invalid currency codes', () => {
    assert.throws(() => createMoney({ amount: 10, currency: 'US' }), TypeError);
    assert.throws(() => createMoney({ amount: 10, currency: 'DOLLARS' }), TypeError);
    assert.throws(() => createMoney({ amount: 10, currency: 42 }), TypeError);
  });

  test('createMoney throws on null input', () => {
    assert.throws(() => createMoney(null), TypeError);
  });

  test('addMoney sums same-currency amounts', () => {
    assert.deepEqual(
      addMoney({ amount: 1000, currency: 'USD' }, { amount: 500, currency: 'USD' }),
      { amount: 1500, currency: 'USD' },
    );
  });

  test('addMoney rejects mixed currencies', () => {
    assert.throws(
      () => addMoney({ amount: 100, currency: 'USD' }, { amount: 100, currency: 'EUR' }),
      TypeError,
    );
  });

  test('subtractMoney rejects negative results', () => {
    assert.throws(
      () => subtractMoney({ amount: 100, currency: 'USD' }, { amount: 200, currency: 'USD' }),
      TypeError,
    );
  });

  test('formatMoney renders decimals for normal currencies and integers for zero-decimal', () => {
    assert.equal(formatMoney({ amount: 1999, currency: 'USD' }), '19.99 USD');
    assert.equal(formatMoney({ amount: 50, currency: 'USD' }), '0.50 USD');
    assert.equal(formatMoney({ amount: 1000, currency: 'JPY' }), '1000 JPY');
  });
});

describe('payments domain — payment intent', () => {
  test('validatePaymentIntentInput normalizes amount and defaults metadata', () => {
    const out = validatePaymentIntentInput({
      amount: { amount: 1999, currency: 'usd' },
    });
    assert.deepEqual(out.amount, { amount: 1999, currency: 'USD' });
    assert.deepEqual(out.metadata, {});
  });

  test('validatePaymentIntentInput accepts optional fields', () => {
    const out = validatePaymentIntentInput({
      amount: { amount: 100, currency: 'USD' },
      customerId: 'cus_1',
      description: 'Pro plan',
      metadata: { order: '42' },
    });
    assert.equal(out.customerId, 'cus_1');
    assert.equal(out.description, 'Pro plan');
    assert.deepEqual(out.metadata, { order: '42' });
  });

  test('validatePaymentIntentInput throws on missing amount', () => {
    assert.throws(() => validatePaymentIntentInput({}), TypeError);
    assert.throws(() => validatePaymentIntentInput(null), TypeError);
  });

  test('validatePaymentIntentInput throws on invalid customerId/description/metadata', () => {
    const base = { amount: { amount: 100, currency: 'USD' } };
    assert.throws(() => validatePaymentIntentInput({ ...base, customerId: '' }), TypeError);
    assert.throws(() => validatePaymentIntentInput({ ...base, description: 42 }), TypeError);
    assert.throws(() => validatePaymentIntentInput({ ...base, metadata: { ok: 42 } }), TypeError);
    assert.throws(() => validatePaymentIntentInput({ ...base, metadata: ['nope'] }), TypeError);
  });

  test('nextConfirmStatus succeeds for normal payment methods', () => {
    const intent = {
      id: 'pi_1',
      amount: { amount: 100, currency: 'USD' },
      amountRefunded: { amount: 0, currency: 'USD' },
      status: 'requires_payment_method',
      metadata: {},
      createdAt: 0,
    };
    assert.equal(nextConfirmStatus(intent, 'pm_card_visa'), 'succeeded');
  });

  test('nextConfirmStatus fails for pm_fail* payment methods', () => {
    const intent = {
      id: 'pi_1',
      amount: { amount: 100, currency: 'USD' },
      amountRefunded: { amount: 0, currency: 'USD' },
      status: 'requires_payment_method',
      metadata: {},
      createdAt: 0,
    };
    assert.equal(nextConfirmStatus(intent, 'pm_fail_declined'), 'failed');
  });

  test('nextConfirmStatus throws on missing paymentMethod or wrong status', () => {
    const intent = {
      id: 'pi_1',
      amount: { amount: 100, currency: 'USD' },
      amountRefunded: { amount: 0, currency: 'USD' },
      status: 'succeeded',
      metadata: {},
      createdAt: 0,
    };
    assert.throws(() => nextConfirmStatus(intent, ''), TypeError);
    assert.throws(() => nextConfirmStatus(intent, 'pm_card_visa'), TypeError);
  });

  test('nextRefundState transitions succeeded → partially_refunded → refunded', () => {
    let intent = {
      id: 'pi_1',
      amount: { amount: 1000, currency: 'USD' },
      amountRefunded: { amount: 0, currency: 'USD' },
      status: 'succeeded',
      metadata: {},
      createdAt: 0,
    };
    const partial = nextRefundState(intent, { amount: 300, currency: 'USD' });
    assert.equal(partial.status, 'partially_refunded');
    assert.equal(partial.amountRefunded.amount, 300);
    intent = { ...intent, ...partial };
    const full = nextRefundState(intent, { amount: 700, currency: 'USD' });
    assert.equal(full.status, 'refunded');
    assert.equal(full.amountRefunded.amount, 1000);
  });

  test('nextRefundState rejects over-refund and wrong currency', () => {
    const intent = {
      id: 'pi_1',
      amount: { amount: 1000, currency: 'USD' },
      amountRefunded: { amount: 0, currency: 'USD' },
      status: 'succeeded',
      metadata: {},
      createdAt: 0,
    };
    assert.throws(() => nextRefundState(intent, { amount: 2000, currency: 'USD' }), TypeError);
    assert.throws(() => nextRefundState(intent, { amount: 100, currency: 'EUR' }), TypeError);
  });

  test('nextRefundState throws when intent is not refundable', () => {
    const intent = {
      id: 'pi_1',
      amount: { amount: 100, currency: 'USD' },
      amountRefunded: { amount: 0, currency: 'USD' },
      status: 'requires_payment_method',
      metadata: {},
      createdAt: 0,
    };
    assert.throws(() => nextRefundState(intent, { amount: 10, currency: 'USD' }), TypeError);
  });
});

describe('payments domain — webhook', () => {
  const SECRET = 'whsec_test_secret';

  function sign(body, timestamp, secret = SECRET) {
    return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  }

  test('parseSignatureHeader extracts timestamp and v1 signatures', () => {
    const parsed = parseSignatureHeader('t=1700000000,v1=abc123,v1=def456');
    assert.equal(parsed.timestamp, 1700000000);
    assert.deepEqual(parsed.signatures, ['abc123', 'def456']);
  });

  test('parseSignatureHeader throws on missing timestamp or signatures', () => {
    assert.throws(() => parseSignatureHeader('v1=abc'), TypeError);
    assert.throws(() => parseSignatureHeader('t=1700000000'), TypeError);
    assert.throws(() => parseSignatureHeader(''), TypeError);
    assert.throws(() => parseSignatureHeader(null), TypeError);
  });

  test('computeSignature matches HMAC-SHA256 over <timestamp>.<body>', () => {
    const body = '{"event":"payment.succeeded"}';
    const ts = 1700000000;
    assert.equal(computeSignature(body, ts, SECRET), sign(body, ts));
  });

  test('verifyWebhookSignature accepts a valid fresh signature', () => {
    const body = '{"event":"payment.succeeded"}';
    const ts = 1700000000;
    const header = `t=${ts},v1=${sign(body, ts)}`;
    assert.equal(verifyWebhookSignature(body, header, SECRET, { now: () => ts * 1000 }), true);
  });

  test('verifyWebhookSignature rejects tampered body', () => {
    const ts = 1700000000;
    const header = `t=${ts},v1=${sign('original', ts)}`;
    assert.throws(
      () => verifyWebhookSignature('tampered', header, SECRET, { now: () => ts * 1000 }),
      TypeError,
    );
  });

  test('verifyWebhookSignature rejects wrong secret', () => {
    const body = 'body';
    const ts = 1700000000;
    const header = `t=${ts},v1=${sign(body, ts, 'other_secret')}`;
    assert.throws(
      () => verifyWebhookSignature(body, header, SECRET, { now: () => ts * 1000 }),
      TypeError,
    );
  });

  test('verifyWebhookSignature rejects stale timestamps', () => {
    const body = 'body';
    const ts = 1700000000;
    const header = `t=${ts},v1=${sign(body, ts)}`;
    assert.throws(
      () => verifyWebhookSignature(body, header, SECRET, { now: () => (ts + 10_000) * 1000 }),
      TypeError,
    );
  });

  test('verifyWebhookSignature accepts one of multiple signatures (rotation)', () => {
    const body = 'body';
    const ts = 1700000000;
    const header = `t=${ts},v1=deadbeef,v1=${sign(body, ts)}`;
    assert.equal(verifyWebhookSignature(body, header, SECRET, { now: () => ts * 1000 }), true);
  });

  test('verifyWebhookSignature rejects empty body or secret', () => {
    assert.throws(() => verifyWebhookSignature('', 't=1,v1=a', SECRET), TypeError);
    assert.throws(() => verifyWebhookSignature('body', 't=1,v1=a', ''), TypeError);
  });
});

describe('payments port — assertPaymentsPort', () => {
  test('accepts the memory adapter', () => {
    assert.doesNotThrow(() => assertPaymentsPort(createMemoryPaymentsAdapter()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertPaymentsPort(null), TypeError);
    assert.throws(() => assertPaymentsPort(42), TypeError);
  });

  test('rejects adapters missing required methods', () => {
    assert.throws(
      () =>
        assertPaymentsPort({
          createCustomer: () => {},
          createPaymentIntent: () => {},
          confirmPaymentIntent: () => {},
          refund: () => {},
          verifyWebhook: () => {},
          // missing listIntents + clear
        }),
      TypeError,
    );
  });
});

describe('payments adapter — memory (customers + intents)', () => {
  test('createCustomer stamps id + createdAt and normalizes metadata', async () => {
    const now = 1000;
    const payments = createMemoryPaymentsAdapter({ now: () => now });
    const customer = await payments.createCustomer({
      email: 'alice@example.com',
      name: 'Alice',
      metadata: { plan: 'pro' },
    });
    assert.equal(customer.id, 'cus_1');
    assert.equal(customer.email, 'alice@example.com');
    assert.equal(customer.name, 'Alice');
    assert.deepEqual(customer.metadata, { plan: 'pro' });
    assert.equal(customer.createdAt, 1000);
  });

  test('createCustomer rejects missing email and invalid metadata', async () => {
    const payments = createMemoryPaymentsAdapter();
    await assert.rejects(() => payments.createCustomer({}), TypeError);
    await assert.rejects(() => payments.createCustomer({ email: '' }), TypeError);
    await assert.rejects(
      () => payments.createCustomer({ email: 'a@b.co', metadata: { ok: 42 } }),
      TypeError,
    );
  });

  test('createPaymentIntent starts in requires_payment_method with zero refunds', async () => {
    const payments = createMemoryPaymentsAdapter();
    const intent = await payments.createPaymentIntent({
      amount: { amount: 1999, currency: 'USD' },
    });
    assert.equal(intent.id, 'pi_1');
    assert.equal(intent.status, 'requires_payment_method');
    assert.equal(intent.amountRefunded.amount, 0);
  });
});

describe('payments adapter — memory (confirm + refund)', () => {
  test('confirm success path moves intent to succeeded', async () => {
    const payments = createMemoryPaymentsAdapter();
    const intent = await payments.createPaymentIntent({
      amount: { amount: 1000, currency: 'USD' },
    });
    const confirmed = await payments.confirmPaymentIntent(intent.id, {
      paymentMethod: 'pm_card_visa',
    });
    assert.equal(confirmed.status, 'succeeded');
    assert.equal(confirmed.paymentMethod, 'pm_card_visa');
  });

  test('confirm with pm_fail* moves intent to failed', async () => {
    const payments = createMemoryPaymentsAdapter();
    const intent = await payments.createPaymentIntent({
      amount: { amount: 1000, currency: 'USD' },
    });
    const confirmed = await payments.confirmPaymentIntent(intent.id, {
      paymentMethod: 'pm_fail_declined',
    });
    assert.equal(confirmed.status, 'failed');
  });

  test('confirm throws on unknown intent or missing options', async () => {
    const payments = createMemoryPaymentsAdapter();
    await assert.rejects(
      () => payments.confirmPaymentIntent('pi_missing', { paymentMethod: 'pm_card_visa' }),
      TypeError,
    );
    const intent = await payments.createPaymentIntent({
      amount: { amount: 100, currency: 'USD' },
    });
    await assert.rejects(() => payments.confirmPaymentIntent(intent.id, null), TypeError);
  });

  test('partial refund then full refund walks the state machine', async () => {
    const payments = createMemoryPaymentsAdapter();
    const intent = await payments.createPaymentIntent({
      amount: { amount: 1000, currency: 'USD' },
    });
    await payments.confirmPaymentIntent(intent.id, { paymentMethod: 'pm_card_visa' });
    const r1 = await payments.refund(intent.id, { amount: { amount: 300, currency: 'USD' } });
    assert.equal(r1.id, 're_1');
    assert.equal(r1.amount.amount, 300);
    let [current] = payments.listIntents({ status: 'partially_refunded' });
    assert.equal(current.amountRefunded.amount, 300);
    await payments.refund(intent.id); // remainder
    [current] = payments.listIntents({ status: 'refunded' });
    assert.equal(current.amountRefunded.amount, 1000);
  });

  test('refund on unconfirmed intent throws', async () => {
    const payments = createMemoryPaymentsAdapter();
    const intent = await payments.createPaymentIntent({
      amount: { amount: 100, currency: 'USD' },
    });
    await assert.rejects(() => payments.refund(intent.id), TypeError);
  });

  test('listIntents filters by status and customerId', async () => {
    const payments = createMemoryPaymentsAdapter();
    const c1 = await payments.createCustomer({ email: 'a@b.co' });
    const c2 = await payments.createCustomer({ email: 'c@d.co' });
    await payments.createPaymentIntent({
      amount: { amount: 100, currency: 'USD' },
      customerId: c1.id,
    });
    await payments.createPaymentIntent({
      amount: { amount: 200, currency: 'USD' },
      customerId: c2.id,
    });
    assert.equal(payments.listIntents({ customerId: c1.id }).length, 1);
    assert.equal(payments.listIntents({ status: 'requires_payment_method' }).length, 2);
  });

  test('clear drops customers, intents, and refunds', async () => {
    const payments = createMemoryPaymentsAdapter();
    await payments.createCustomer({ email: 'a@b.co' });
    await payments.createPaymentIntent({ amount: { amount: 10, currency: 'USD' } });
    payments.clear();
    assert.equal(payments.listIntents().length, 0);
    // counters reset — next customer is cus_1 again
    const next = await payments.createCustomer({ email: 'new@b.co' });
    assert.equal(next.id, 'cus_1');
  });
});

describe('payments adapter — memory (webhook verify)', () => {
  test('verifyWebhook delegates to the domain verifier with injected clock', () => {
    const ts = 1700000000;
    const payments = createMemoryPaymentsAdapter({ now: () => ts * 1000 });
    const body = '{"event":"ok"}';
    const secret = 'whsec_k';
    const header = `t=${ts},v1=${createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')}`;
    assert.equal(payments.verifyWebhook(body, header, secret), true);
  });

  test('verifyWebhook throws on mismatch', () => {
    const ts = 1700000000;
    const payments = createMemoryPaymentsAdapter({ now: () => ts * 1000 });
    assert.throws(
      () => payments.verifyWebhook('body', `t=${ts},v1=deadbeef`, 'whsec_k'),
      TypeError,
    );
  });
});
