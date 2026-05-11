<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the tenancy hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx tenancy
@public false
@edit careful -->

# tenancy

Hexagonal tenancy module — pure `Tenant` value object, header/subdomain resolvers, `TenantStorePort` with an in-memory adapter, and an optional `AsyncLocalStorage`-backed context helper. Zero external dependencies (only `node:async_hooks` in the ALS adapter).

## Why

Multi-tenancy is a TOP-100 starter staple that most templates either hard-wire into auth/billing/db middleware or skip entirely. When the isolation strategy changes (header → subdomain → JWT claim), every caller changes with it. This module keeps tenant validation, resolution, and context scoping as a pure domain, wraps persistence behind a 5-method `TenantStorePort`, and ships two zero-dependency adapters: an in-memory store for tests + the api-starter demo, and an ALS-backed scope helper for server-side request handling. Other modules (auth, billing, payments, search, …) can opt in to tenant-scoped behavior by taking a `Tenant` or a `TenantContext` at their boundary without depending on any particular isolation mechanism.

Tenant ids are slug-like (`/^[a-z0-9][a-z0-9-]{0,63}$/`), so they stay safe for URLs, subdomains, database keys, and filesystem paths without any extra escaping.

## Structure

```text
modules/tenancy/
├── domain/
│   ├── tenant.mjs              # Tenant value object (validated slug id + name + metadata)
│   ├── tenant-context.mjs      # Pure { tenant } context + require/with helpers
│   └── tenant-resolver.mjs     # resolveTenantFromHeaders + resolveTenantFromSubdomain
├── ports/
│   └── tenant-store-port.mjs   # TenantStorePort + assertTenantStorePort
├── adapters/
│   ├── memory-tenant-store.mjs # In-memory Map-backed store (tests + api-starter demo)
│   └── als-tenant-context.mjs  # AsyncLocalStorage scope helper (node:async_hooks only)
├── public-api.mjs              # Cross-module entry point
├── messages.mjs                # i18n keys
├── manifest.json               # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                     |
| ------------ | ---------------- | ------------------------------------------------------------------------ |
| **Domain**   | `domain/`        | Pure functions, no I/O, no framework imports, no `node:async_hooks`.     |
| **Ports**    | `ports/`         | `TenantStorePort` contract (5 methods)                                   |
| **Adapters** | `adapters/`      | In-memory store + ALS scope helper (the only file using `node:async_hooks`). |
| **Public**   | `public-api.mjs` | The only file other modules may import.                                  |

## Usage

### Create a tenant and store it

```javascript
import {
  createTenant,
  createMemoryTenantStore,
  assertTenantStorePort,
} from './modules/tenancy/public-api.mjs';

const store = createMemoryTenantStore();
assertTenantStorePort(store);

const acme = await store.createTenant({
  id: 'acme',
  name: 'Acme, Inc.',
  metadata: { plan: 'pro' },
});
// → { id: 'acme', name: 'Acme, Inc.', metadata: { plan: 'pro' } }

const fetched = await store.getTenant('acme');
const all = store.listTenants();
await store.deleteTenant('acme');
```

### Resolve a tenant from an HTTP header

```javascript
import { resolveTenantFromHeaders } from './modules/tenancy/public-api.mjs';

// In your request handler:
const tenantId = resolveTenantFromHeaders(req.headers); // reads 'x-tenant-id'
// Or with a custom header:
const alt = resolveTenantFromHeaders(req.headers, { headerName: 'x-account' });
```

### Resolve a tenant from a subdomain

```javascript
import { resolveTenantFromSubdomain } from './modules/tenancy/public-api.mjs';

// 'acme.example.com' → 'acme', 'www.example.com' → null
const tenantId = resolveTenantFromSubdomain(req.headers.host, {
  rootDomain: 'example.com',
});
```

### Scope a tenant across async work with AsyncLocalStorage

```javascript
import {
  createAlsTenantContext,
  createTenant,
} from './modules/tenancy/public-api.mjs';

const tenantScope = createAlsTenantContext();

// At your request boundary:
app.use(async (req, res, next) => {
  const tenant = createTenant({ id: req.headers['x-tenant-id'] });
  tenantScope.run(tenant, () => next());
});

// Anywhere downstream — no ctx threading needed:
function currentTenant() {
  return tenantScope.require(); // throws if outside a run(...)
}
```

The pure `createTenantContext` / `withTenant` / `requireTenant` helpers work the same way but thread an explicit `{ tenant }` shape through call sites instead of relying on `AsyncLocalStorage`. Use them in framework-free or browser code where ALS is not available.

## Rules

- Domain is pure. `node:async_hooks` lives only in `adapters/als-tenant-context.mjs`.
- Tenant ids are always slug-like (`/^[a-z0-9][a-z0-9-]{0,63}$/`).
- Adapters validate every input through `createTenant` — no bypassing the domain.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/tenancy.test.mjs` — proves tenant validation, resolvers, context helpers, port assertion, memory store, ALS scope.
- `tests/contract/tenancy-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
