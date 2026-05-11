<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and setup guide for the api-starter app.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!-- SpecRefs: TPL-177
-->
# api-starter

Server-side API app shell — the server-side mirror of `apps/starter/`.

Demonstrates that the same hex modules work on the server with different adapters. Zero external dependencies — uses only `node:http` and hex module public APIs.

## Architecture

```
apps/api-starter/
├── app.mjs          — Server shell: adapter wiring + HTTP server
├── app-config.mjs   — Environment-based configuration
├── routes/          — Route handlers
│   ├── health.mjs   — GET /health
│   ├── greeting.mjs — GET /api/greet?name=Alice (uses cache + log modules)
│   ├── oauth.mjs    — GET /auth/oauth/start + /auth/oauth/callback (OAuth 2.0 flow behind OAuthProviderPort)
│   ├── jobs.mjs     — GET /api/jobs/enqueue, /api/jobs, /api/jobs/run (background jobs behind JobQueuePort)
│   ├── email.mjs    — GET /api/email/send + /api/email/list (outbound email behind EmailPort via job-queue)
│   ├── search.mjs   — GET /api/search/query + /api/search/index (full-text search behind SearchPort)
│   ├── payments.mjs — GET /api/payments/customer + /intent + /confirm + /list (PaymentsPort)
│   ├── tenancy.mjs  — GET /api/tenancy/create + /get + /list (TenantStorePort)
│   ├── cqrs.mjs     — GET /api/cqrs/dispatch + /ask + /events (CommandBusPort + QueryBusPort + EventStorePort)
│   ├── pwa.mjs      — GET /manifest.webmanifest + /sw.js (PwaAssetPort)
│   ├── seo.mjs      — GET /sitemap.xml + /robots.txt + /api/seo/meta (SeoPublisherPort)
│   ├── theme.mjs    — GET /api/theme/tokens + /api/theme/preference + /api/theme/preference/set (ThemePreferenceStorePort)
│   ├── graphql.mjs  — GET /api/graphql?query=... (GraphqlTransportPort against a demo schema)
│   ├── prerender.mjs — GET /api/prerender/run + /api/prerender/output?path=... (SSG primitive via StaticOutputPort)
│   └── openapi.mjs  — GET /openapi.json (OpenAPI 3 document built from the route registry)
├── manifest.json    — App metadata
└── README.md
```

## Wired modules

| Module     | Server adapter                                                    | Browser equivalent     |
| ---------- | ----------------------------------------------------------------- | ---------------------- |
| cache      | `createMemoryLruAdapter`                                          | Same (isomorphic)      |
| log        | `createStructuredJsonAdapter`                                     | `createConsoleAdapter` |
| event-bus  | `createNodeEventBus`                                              | `createMemoryEventBus` |
| db         | `createMemoryDatabaseAdapter`                                     | N/A (server-only)      |
| openapi    | `createRouteRegistryOpenApiAdapter`                               | Same (isomorphic)      |
| rate-limit | `createMemoryRateLimiter`                                         | Same (isomorphic)      |
| monitoring | `createConsoleMonitoringAdapter`                                  | Same (isomorphic)      |
| auth       | `createMemoryOAuthProvider` (default) + Google / GitHub providers | Same (isomorphic)      |
| job-queue  | `createMemoryJobQueue` + `createJobWorker`                        | Same (isomorphic)      |
| email      | `createMemoryEmailAdapter` (default) + `createConsoleEmailAdapter`| Same (isomorphic)      |
| search     | `createMemorySearchAdapter`                                       | Same (isomorphic)      |
| payments   | `createMemoryPaymentsAdapter`                                     | Same (isomorphic)      |
| tenancy    | `createMemoryTenantStore`                                         | Same (isomorphic)      |
| cqrs       | `createMemoryCommandBus` + `createMemoryQueryBus` + store         | Same (isomorphic)      |
| pwa        | `createMemoryPwaAssetStore`                                       | Same (isomorphic)      |
| seo        | `createMemorySeoPublisher`                                        | Same (isomorphic)      |
| theme      | `createMemoryThemePreferenceStore`                                | Same (isomorphic)      |
| graphql    | `createMemoryGraphqlTransport`                                    | Same (isomorphic)      |
| prerender  | `createMemoryStaticOutput` + `createSequentialPrerenderRunner`    | Same (isomorphic)      |

## Configuration

| Variable                       | Default                   | Description                                 |
| ------------------------------ | ------------------------- | ------------------------------------------- |
| `NODE_ENV`                     | `development`             | Server mode                                 |
| `PORT`                         | `3000`                    | Listen port                                 |
| `HOST`                         | `0.0.0.0`                 | Listen host / bind address                  |
| `RATE_LIMIT_CAPACITY`          | `60`                      | Token-bucket burst capacity per key         |
| `RATE_LIMIT_REFILL_PER_SECOND` | `30`                      | Tokens refilled per second per key          |
| `EMAIL_MODE`                   | `memory`                  | `memory` (default) or `console`             |
| `EMAIL_FROM`                   | `hello@api-starter.local` | Default sender address for /api/email/send  |

All values are read from `process.env` at startup via `app-config.mjs`.

## CORS

All responses include permissive CORS headers by default (`Access-Control-Allow-Origin: *`). `OPTIONS` preflight requests return `204 No Content` with the appropriate headers. Override `DEFAULT_CORS` in `app.mjs` for production use.

## Usage

```bash
node apps/api-starter/app.mjs
```

```bash
PORT=8080 node apps/api-starter/app.mjs
curl http://localhost:3000/health
curl http://localhost:3000/api/greet?name=Alice
curl http://localhost:3000/openapi.json
```

## Testing

```bash
node --test tests/unit/api-starter.test.mjs
```

## Rules

- Imports from hex modules go through `public-api.mjs` only.
- No external dependencies — `node:http` + hex modules.
- Adapter selection happens in `createAppContext()` — the single seam.
