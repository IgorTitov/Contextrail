<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the subscription hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx subscription
@public false
@edit careful -->

# subscription

Subscription lifecycle, plan tiers, entitlements, and usage metering

## Structure

```
modules/subscription/
├── domain/
│   └── subscription.mjs        # Pure domain logic (no deps)
├── ports/
│   └── subscription-port.mjs   # Port contract + validator
├── adapters/
│   └── default-adapter.mjs # Concrete adapter
├── messages.mjs            # i18n message registry
├── manifest.json           # Module metadata + capability surface
├── public-api.mjs          # Single cross-module entry point
└── README.md
```

## Usage

```javascript
import {
  createSubscription,
  hasEntitlement,
  assertSubscriptionPort,
  createMemorySubscriptionAdapter,
} from '../../modules/subscription/public-api.mjs';

const plans = [
  { id: 'free', name: 'Free', entitlements: ['basic-view'], priceMonthly: 0 },
  { id: 'pro', name: 'Pro', entitlements: ['basic-view', 'export'], priceMonthly: 1999 },
];

const adapter = createMemorySubscriptionAdapter(plans);
assertSubscriptionPort(adapter);

const sub = await adapter.create({ userId: 'u1', planId: 'pro' });
const canExport = await adapter.checkEntitlement('u1', 'export'); // true
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- All user-facing copy uses i18n keys via `messages.mjs`.
