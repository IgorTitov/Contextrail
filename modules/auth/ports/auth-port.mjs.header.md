---
fileId: contextrail-template:modules:auth:ports:auth-port
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: auth
owns: AuthPort interface; AuthUser, AuthCredentials, AuthResult, AuthChangeEvent type definitions; assertAuthPort runtime validator.
boundaries: Must not contain adapter logic, framework references, or storage coupling. Must not evolve into an abstract base class.
invariants: assertAuthPort must throw for any object missing required port methods; type shapes must remain stable within a minor version; this file must have no runtime dependencies.
risks: Changing type shapes breaks every adapter and integration silently if not covered by contract tests; assertAuthPort gaps allow non-compliant adapters to pass through.
notesForLLM: This is the sole shape authority for the auth port. Changes here cascade to all adapters and consumers. Expand assertAuthPort checks when adding new required methods.
tests:
  - tests/unit/auth.test.mjs
  - tests/contract/auth-hex-contract.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-063
related:
  - modules/auth/public-api.mjs
  - modules/auth/domain/auth-state.mjs
summary: Auth port contract for the auth module.
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
portCategory: credential
contractTests: tests/contract/auth-hex-contract.test.mjs
---

# auth-port.mjs
