<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the payments hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx payments
@public false
@edit careful -->

# payments

Hexagonal payments module — pure money, payment-intent, and webhook-verify domain + in-memory adapter behind a narrow `PaymentsPort`. Zero external dependencies (only `node:crypto`).

## Why

Charging money is a TOP-100 starter staple that most templates implement by hard-wiring the Stripe SDK across every caller. When the provider changes (Stripe → Adyen, Braintree → Paddle), every caller changes with it. This module keeps money arithmetic, payment-intent state transitions, and webhook signature verification as a pure domain, wraps provider operations in a 7-method port, and ships a zero-dependency memory adapter that is enough to demo the full flow in api-starter. Real provider adapters (Stripe, Adyen, Braintree, Lemon Squeezy) can plug in later behind the same seam without touching any caller.

The webhook verifier implements the standard Stripe-style `t=<ts>,v1=<hex>` signature format with HMAC-SHA256 in constant time — real providers can reuse it as-is.

## Structure

```text
modules/payments/
├── domain/
│   ├── money.mjs                     # Money value object (integer minor units + ISO-4217)
│   ├── payment-intent.mjs            # Intent state machine (requires → succeeded/failed, refunds)
│   └── webhook-event.mjs             # Parse signature header + HMAC-SHA256 verify
├── ports/
│   └── payments-port.mjs             # PaymentsPort + assertPaymentsPort
├── adapters/
│   └── memory-payments-adapter.mjs   # In-memory fake (tests + api-starter demo)
├── public-api.mjs                    # Cross-module entry point
├── messages.mjs                      # i18n keys
├── manifest.json                     # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                          |
| ------------ | ---------------- | ------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O. Uses `node:crypto` for HMAC only.     |
| **Ports**    | `ports/`         | `PaymentsPort` contract (7 methods)                           |
| **Adapters** | `adapters/`      | In-memory implementation for tests + dev                     |
| **Public**   | `public-api.mjs` | The only file other modules may import                       |

## Usage

### Create, confirm, refund

```javascript
import {
  createMemoryPaymentsAdapter,
  assertPaymentsPort,
} from './modules/payments/public-api.mjs';

const payments = createMemoryPaymentsAdapter();
assertPaymentsPort(payments);

const customer = await payments.createCustomer({
  email: 'alice@example.com',
  name: 'Alice',
});

const intent = await payments.createPaymentIntent({
  amount: { amount: 1999, currency: 'USD' }, // $19.99
  customerId: customer.id,
  description: 'Pro plan — monthly',
});
// intent.status === 'requires_payment_method'

const confirmed = await payments.confirmPaymentIntent(intent.id, {
  paymentMethod: 'pm_card_visa',
});
// confirmed.status === 'succeeded'

// Partial refund
await payments.refund(confirmed.id, {
  amount: { amount: 500, currency: 'USD' }, // $5.00
});
// intent.status → 'partially_refunded'
```

### Deterministic failure for tests

Payment methods whose id starts with `pm_fail` simulate a declined charge.
Useful for proving the `failed` branch without real provider integration.

```javascript
await payments.confirmPaymentIntent(intent.id, {
  paymentMethod: 'pm_fail_declined',
});
// intent.status → 'failed'
```

### Verify a webhook

```javascript
import { verifyWebhookSignature } from './modules/payments/public-api.mjs';

// Inside your webhook route:
const rawBody = await readRawBody(req);
const signature = req.headers['stripe-signature'];
try {
  verifyWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET);
  const event = JSON.parse(rawBody);
  await handleEvent(event);
} catch (err) {
  res.statusCode = 400;
  res.end('invalid signature');
}
```

## Rules

- Domain is pure. Clocks, id generation, and HMAC secrets are injected at the boundary.
- Money amounts are **always** non-negative integers in minor units. Never floats.
- Adapters stamp ids and timestamps; domain never touches the clock.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/payments.test.mjs` — proves money arithmetic, intent state machine, webhook HMAC, adapter flows.
- `tests/contract/payments-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
