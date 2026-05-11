---
fileId: contextrail-template:modules:api-client:adapters:fetch-adapter
module: modules/api-client
stability: evolving
steward: shared
api: module-public
hexLayer: adapter
boundedContext: api-client
dependsOn: modules/api-client/ports/api-client-port.mjs
owns: Native fetch() transport wiring; base URL resolution; JSON serialization and deserialization; HTTP error normalization into ApiError shape.
boundaries: Must not contain business logic, auth token injection, or retry orchestration beyond basic error wrapping. Auth concerns belong in auth-api-integration.
invariants: Returned object must satisfy ApiClientPort; non-2xx responses must be normalized to ApiError; fetch must not be called outside the request method.
risks: fetch availability depends on runtime environment (Node 18+ or browser); unhandled network errors bypass normalization and surface as raw exceptions; base URL misconfiguration silently hits wrong endpoints.
notesForLLM: Use when the api-client port needs to reach an HTTP endpoint. Abort signals and timeouts must be honored through the port interface.
tests: tests/unit/api-client.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-069
related:
  - modules/api-client/public-api.mjs
  - modules/api-client/ports/api-client-port.mjs
  - modules/auth/domain/auth-api-integration.mjs
summary: HTTP fetch adapter for the api-client module. Uses the platform fetch API in browser and Node 18+.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: network
implementsPort: api-client-port
runtimeEnvironment: universal
transport: http/rest
externalSystems:
  - http
---

# fetch-adapter.mjs
