---
fileId: contextrail-template:modules:api-client:ports:api-client-port
module: modules/api-client
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: api-client
owns: ApiClientPort interface; ApiRequest, ApiResponse, ApiError type definitions; assertApiClientPort runtime validator.
boundaries: Must not contain transport logic, fetch calls, or adapter implementations. Must not evolve into an abstract base class or utility library.
invariants: assertApiClientPort must throw for any object missing the required request method; type shapes must remain stable within a minor version; this file must have no runtime dependencies.
risks: Changing type shapes breaks all adapters and auth-api-integration silently if not covered by contract tests; assertApiClientPort gaps allow non-compliant adapters to slip through.
notesForLLM: This is the shape authority for the api-client port. Changes cascade to fetch-adapter and auth-api-integration. Expand assertApiClientPort when adding new required methods.
tests:
  - tests/unit/api-client.test.mjs
  - tests/contract/api-client-hex-contract.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-068
related:
  - modules/api-client/public-api.mjs
  - modules/api-client/adapters/fetch-adapter.mjs
  - modules/auth/domain/auth-api-integration.mjs
summary: Api Client port contract for the api-client module.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: network
contractTests: tests/contract/api-client-hex-contract.test.mjs
---

# api-client-port.mjs
