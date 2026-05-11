---
fileId: contextrail-template:modules:api-client:public-api
module: modules/api-client
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: api-client
dependsOn:
  - modules/api-client/ports/api-client-port.mjs
  - modules/api-client/adapters/fetch-adapter.mjs
summary: Single entry point for the api-client bounded module — re-exports assertApiClientPort and createFetchAdapter.
owns: The complete and stable external surface of the api-client module; the boundary enforcing no deep imports from outside consumers.
boundaries: Must not contain business logic. Must not import from other modules' internals. Must not re-export internal helpers not intended for cross-module use.
invariants: All cross-module api-client imports must go through this file only; removing an export is a breaking change requiring a version bump; exports must remain consistent with the api-client hex contract test.
risks: Adding an internal export here accidentally broadens the module surface; removing an export silently breaks consumers not caught by contract tests.
notesForLLM: This is the only file external code may import from the api-client module. Before adding an export, confirm it belongs to the public surface and is covered by contract tests.
tests: tests/contract/api-client-hex-contract.test.mjs
linkedDocs:
  - docs/prd/auth-api-client.md
  - docs/_generated/dependency-graph.json
specRefs: TPL-062
related:
  - modules/api-client/ports/api-client-port.mjs
  - tests/contract/api-client-hex-contract.test.mjs
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertApiClientPort
  - createFetchAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

