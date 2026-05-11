<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for tenancy/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/tenancy/adapters/

Adapter implementations for the tenancy module. Ships a zero-dependency in-memory `TenantStorePort` adapter for tests and the api-starter demo, plus an `AsyncLocalStorage`-backed tenant context helper for server-side scope binding. Real persistence adapters (SQL, KV, HTTP) should implement the same port and be swapped in at composition time. This directory is the only place in the tenancy module allowed to import `node:async_hooks`.
