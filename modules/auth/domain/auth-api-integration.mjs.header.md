---
fileId: contextrail-template:modules:auth:domain:auth-api-integration
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: domain
boundedContext: auth
dependsOn:
  - modules/auth/ports/auth-port.mjs
  - modules/api-client/ports/api-client-port.mjs
owns: Authorization header injection logic; auth-state subscription lifecycle tied to the returned client's destroy method.
boundaries: Must not implement HTTP transport or auth credential verification. Must not hold business logic beyond token injection. Must not couple to a specific adapter implementation.
invariants: Returned client must satisfy ApiClientPort; destroy must unsubscribe the auth listener; token must be refreshed on every request reflecting the current auth state at call time.
risks: Auth listener not destroyed on component teardown causes memory leaks; stale token injection if auth state change is missed between subscription and request.
securityPrivacy: Handles auth tokens in memory; tokens must not be logged or persisted by this layer.
notesForLLM: This is the cross-module seam between auth and api-client. It wraps an ApiClientPort — do not make it depend on a concrete adapter. Always call destroy() to avoid listener leaks.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-070
related:
  - modules/auth/public-api.mjs
  - modules/api-client/ports/api-client-port.mjs
summary: Wraps an ApiClientPort to automatically inject or remove the Authorization Bearer header based on the current auth state, subscribing to auth-change events.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
---

# auth-api-integration.mjs
