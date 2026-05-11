<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the rate-limit hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx rate-limit
@public false
@edit careful -->

# rate-limit

Hexagonal rate-limiting module — pure token-bucket domain plus a memory-backed adapter behind a `RateLimiterPort`. Follows the same hexagonal architecture as every other module in this template. Lets any host app gate a stream of requests (HTTP, queue, CLI) without taking on an external limiter dependency.

## Why

Rate limiting is one of those features every production server needs but most starter templates either skip (silently accept unlimited traffic) or bolt on a single redis-specific library. This module keeps the algorithm as a pure domain, wraps it in a single-method port, and ships a zero-dependency in-memory adapter for the default case. A distributed adapter (redis, upstash, …) can be plugged in later behind the same seam without touching any caller.

## Structure

```text
modules/rate-limit/
├── domain/
│   └── rate-limit.mjs          # Pure token-bucket: createBucketState, refill, consume
├── ports/
│   └── rate-limit-port.mjs     # RateLimiterPort + assertRateLimiterPort
├── adapters/
│   └── default-adapter.mjs     # createMemoryRateLimiter (in-memory, per-key buckets)
├── public-api.mjs              # Cross-module entry point
├── messages.mjs                # i18n keys
├── manifest.json               # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                        |
| ------------ | ---------------- | ------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no framework deps   |
| **Ports**    | `ports/`         | RateLimiterPort contract                    |
| **Adapters** | `adapters/`      | In-memory token-bucket implementation       |
| **Public**   | `public-api.mjs` | The only file other modules may import      |

## Usage

### In a server request handler

```javascript
import { createMemoryRateLimiter } from './modules/rate-limit/public-api.mjs';

const limiter = createMemoryRateLimiter({
  capacity: 20,          // 20 tokens max per bucket
  refillPerSecond: 10,   // regenerates 10 tokens/sec → ~10 rps sustained
});

function handle(req, res) {
  const decision = limiter.check(req.ip);
  if (!decision.allowed) {
    res.writeHead(429, {
      'Retry-After': Math.ceil(decision.retryAfterMs / 1000),
      'X-RateLimit-Remaining': String(decision.remaining),
    });
    res.end('Too Many Requests');
    return;
  }
  // ... normal processing
}
```

### Deterministic tests

```javascript
let now = 1000;
const limiter = createMemoryRateLimiter({
  capacity: 2,
  refillPerSecond: 1,
  now: () => now,
});

limiter.check('k');           // { allowed: true,  remaining: 1 }
limiter.check('k');           // { allowed: true,  remaining: 0 }
limiter.check('k');           // { allowed: false, retryAfterMs: 1000 }
now += 1000;
limiter.check('k');           // { allowed: true,  remaining: 0 }
```

## Rules

- The module is framework-free. Mapping a request to a bucket key (ip, user id, api key, route) is the host app's responsibility.
- The domain does not know about HTTP, 429, headers, or response formats.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/rate-limit.test.mjs` — proves token-bucket math, adapter behavior, and port validation.
- `tests/contract/rate-limit-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
