<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the auth hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx auth
@public false
@edit careful -->

# Auth module

Hex module providing pluggable authentication with multiple swappable adapters.

## Port

- `AuthPort` — login, logout, getUser, isAuthenticated, onAuthChange, offAuthChange

## Adapters

| Adapter | File | Purpose |
|---|---|---|
| Anonymous | `adapters/anonymous-adapter.mjs` | No-auth default, always authenticated |
| Local Password | `adapters/local-password-adapter.mjs` | Demo credentials via StoragePort |
| OAuth Stub | `adapters/oauth-stub-adapter.mjs` | Mock OAuth with configurable provider |
| JWT | `adapters/jwt-adapter.mjs` | Production-grade JWT auth with token verification, claim extraction, and auto-refresh |
| Server Session | `adapters/server-session-adapter.mjs` | Server-side session auth with driver-injected store (isomorphic proof) |

The JWT adapter uses [jose](https://github.com/panva/jose) (ESM, zero-dependency, Web Crypto API) for cryptographic token operations. Test helpers in `jwt-test-helpers.mjs` generate ephemeral keys and signed tokens for testing.

## Domain utilities

- `route-guard.mjs` — evaluates navigation access from auth state
- `auth-api-integration.mjs` — wraps ApiClientPort to inject Authorization header
- `auth-state.mjs` — internal auth state and listener management

## Usage

### Quick start (anonymous / demo)

```js
import { createAnonymousAdapter, createRouteGuard } from './modules/auth/public-api.mjs';

const auth = createAnonymousAdapter();
const guard = createRouteGuard(auth);
const decision = guard.canAccess({ path: '/admin', requiresAuth: true });
```

### JWT adapter (production path)

```js
import { createJwtAdapter } from './modules/auth/public-api.mjs';

const auth = createJwtAdapter({
  verifyKey: publicKey,               // ES256/RS256 public key or HS256 secret
  issuer: 'my-app',                   // optional: validate iss claim
  audience: 'my-api',                 // optional: validate aud claim
  loginFn: async (creds) => {         // your auth endpoint call
    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify(creds) });
    return res.json(); // { accessToken, refreshToken }
  },
  refreshFn: async (refreshToken) => {  // optional: auto-refresh
    const res = await fetch('/api/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    return res.json();
  },
});

const result = await auth.login({ username: 'alice', password: 'secret' });
```

### Environment variables

See `.env.example` and `docs/guides/env-and-keys.md` for key management.

<!-- SpecRefs:
TPL-062; TPL-135
-->
